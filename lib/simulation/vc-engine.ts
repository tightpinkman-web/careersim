import { z } from "zod";

/**
 * Deterministic VC State Tree - the numeric counterpart to the free-form VCPayload narrative
 * content (types/simulation.ts). Mirrors the pattern in lib/simulation/state-machine.ts: the LLM
 * (see lib/llm/vc-schemas.ts) is only ever allowed to critique a decision and score partner
 * conviction, never to invent or restate financial figures - this module is the sole authority on
 * fund capital, cohort financials, ownership math, and risk scoring, so the same (state, action)
 * pair always produces the same numbers regardless of what the model says about them. All currency
 * fields are raw rupees (e.g. 500000000 = ₹50 Cr), not formatted strings - formatting for display
 * is a UI concern.
 */

export const STARTUP_IDS = ["CLOUDSCALE_AI", "ENTERPRISE_MESH", "CLEAN_LOGISTICS"] as const;
export type StartupId = (typeof STARTUP_IDS)[number];

export const STARTUP_NAMES: Record<StartupId, string> = {
  CLOUDSCALE_AI: "CloudScale AI",
  ENTERPRISE_MESH: "Enterprise Mesh",
  CLEAN_LOGISTICS: "CleanLogistics",
};

export const StartupFinancialsSchema = z.object({
  valuationCap: z.number().positive(),
  annualRevenue: z.number().nonnegative(),
  churnRate: z.number().min(0).max(100),
  revenueConcentration: z.number().min(0).max(100),
  cac: z.number().positive(),
  ltv: z.number().nonnegative(),
  liquidationPreference: z.union([z.literal(1), z.literal(2)]),
});
export type StartupFinancials = z.infer<typeof StartupFinancialsSchema>;

export const VCStateSchema = z.object({
  fundReserve: z.number(),
  startups: z.record(z.enum(STARTUP_IDS), StartupFinancialsSchema),
});
export type VCState = z.infer<typeof VCStateSchema>;

/** Baseline cohort financials. CloudScale AI's churn (38%) and revenue concentration (72%) come
 *  directly from the task spec as the deliberately red-flagged deal; Enterprise Mesh and
 *  CleanLogistics are seeded as the comparatively safer and mid-risk alternatives respectively, so
 *  the three decks read as a real "pick your diligence target" cohort rather than three clones. */
export const INITIAL_VC_STATE: VCState = {
  fundReserve: 50_00_00_000,
  startups: {
    CLOUDSCALE_AI: {
      valuationCap: 120_00_00_000,
      annualRevenue: 8_00_00_000,
      churnRate: 38,
      revenueConcentration: 72,
      cac: 185_000,
      ltv: 410_000,
      liquidationPreference: 2,
    },
    ENTERPRISE_MESH: {
      valuationCap: 90_00_00_000,
      annualRevenue: 11_50_00_000,
      churnRate: 9,
      revenueConcentration: 31,
      cac: 240_000,
      ltv: 1_380_000,
      liquidationPreference: 1,
    },
    CLEAN_LOGISTICS: {
      valuationCap: 60_00_00_000,
      annualRevenue: 4_20_00_000,
      churnRate: 17,
      revenueConcentration: 48,
      cac: 95_000,
      ltv: 540_000,
      liquidationPreference: 1,
    },
  },
};

/**
 * Deterministic ownership math: a check of `investmentAmount` against a startup's `valuationCap`
 * always yields the same fund ownership percentage, independent of anything the LLM says in its
 * memo critique.
 */
export function calculateOwnershipPct(investmentAmount: number, startup: StartupFinancials): number {
  if (startup.valuationCap <= 0) return 0;
  return Math.min(100, (investmentAmount / startup.valuationCap) * 100);
}

/**
 * Deterministic risk delta (0-100, higher = riskier) derived purely from the cohort's numbers:
 * churn and revenue concentration raise risk, a healthy LTV:CAC ratio lowers it, and a 2x
 * liquidation preference adds a flat penalty (it subordinates common/early-preferred holders in a
 * down-round or acquisition). Weights are fixed constants so the same startup always scores the
 * same risk regardless of decision history.
 */
export function calculateRiskDelta(startup: StartupFinancials): number {
  const churnRisk = startup.churnRate * 0.9;
  const concentrationRisk = startup.revenueConcentration * 0.5;
  const ltvToCac = startup.cac > 0 ? startup.ltv / startup.cac : 0;
  const unitEconomicsRisk = Math.max(0, 30 - ltvToCac * 10);
  const liquidationPenalty = startup.liquidationPreference === 2 ? 15 : 0;

  const raw = churnRisk + concentrationRisk + unitEconomicsRisk + liquidationPenalty;
  return Math.min(100, Math.max(0, raw));
}

/**
 * Applies a capital allocation decision to the deterministic VC state: deducts the investment from
 * `fundReserve` and returns the resulting ownership % and risk score for the chosen startup. Never
 * mutates its input - callers persist the returned state the same way applyStateDelta's callers do
 * in lib/simulation/state-machine.ts.
 */
export interface AllocationResult {
  state: VCState;
  ownershipPct: number;
  riskDelta: number;
}

export function applyCapitalAllocation(current: VCState, startupId: StartupId, investmentAmount: number): AllocationResult {
  const startup = current.startups[startupId];
  const state: VCState = {
    fundReserve: current.fundReserve - investmentAmount,
    startups: current.startups,
  };

  return {
    state,
    ownershipPct: calculateOwnershipPct(investmentAmount, startup),
    riskDelta: calculateRiskDelta(startup),
  };
}

/** ₹1,20,00,00,000 -> "₹120 Cr", ₹4,20,00,000 -> "₹4.2 L" - Indian-convention short form shared by
 *  every VC-track component that displays the raw rupee integers above, so formatting never drifts
 *  between the Inbound Hub, Data Room, Unit Economics Model, and Term Sheet Builder. */
export function formatINR(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(abs >= 10_00_00_000 ? 0 : 1)} Cr`;
  if (abs >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(1)} L`;
  return `₹${amount.toLocaleString("en-IN")}`;
}
