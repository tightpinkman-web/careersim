import { z } from "zod";

/**
 * Deterministic State Engine - a numeric state tree tracked independently of whatever narrative
 * JSON the Game Master (Gemini/Groq, see lib/llm/provider.ts) returns. The LLM is only ever
 * allowed to propose a `StateDelta` (see lib/llm/schemas.ts); this module is the sole authority on
 * applying it, clamping it to a valid domain, and rejecting narrative/state combinations that
 * contradict each other (e.g. a "record profit" narrative_flavor while cashReserves is bankrupt).
 * This is what makes the engine deterministic and replayable: the same (state, delta) pair always
 * produces the same next state, regardless of what the model says about it.
 */

export const DeterministicStateSchema = z.object({
  cashReserves: z.number(),
  serverHealthPct: z.number().min(0).max(100),
  portfolioDelta: z.number(),
  legalLiabilityScore: z.number().min(0).max(100),
  employeeMorale: z.number().min(0).max(100),
  sprintVelocity: z.number().min(0),
});

export type DeterministicState = z.infer<typeof DeterministicStateSchema>;

export const StateDeltaSchema = DeterministicStateSchema.partial();
export type StateDelta = z.infer<typeof StateDeltaSchema>;

/** Every session starts from this same numeric baseline, regardless of career track - individual
 *  tracks only differ in which of these fields their prompts/rules actually move. */
export const INITIAL_DETERMINISTIC_STATE: DeterministicState = {
  cashReserves: 100_000,
  serverHealthPct: 100,
  portfolioDelta: 0,
  legalLiabilityScore: 0,
  employeeMorale: 70,
  sprintVelocity: 20,
};

const CLAMPS: Record<keyof DeterministicState, [number, number]> = {
  cashReserves: [-Infinity, Infinity],
  serverHealthPct: [0, 100],
  portfolioDelta: [-Infinity, Infinity],
  legalLiabilityScore: [0, 100],
  employeeMorale: [0, 100],
  sprintVelocity: [0, Infinity],
};

function clamp(key: keyof DeterministicState, value: number): number {
  const [min, max] = CLAMPS[key];
  return Math.min(max, Math.max(min, value));
}

export interface TransitionViolation {
  rule: string;
  message: string;
}

/**
 * Each rule inspects the state a delta WOULD produce (never the delta itself, since deltas can be
 * applied cumulatively over many turns) plus the turn's narrative_flavor, and returns a violation
 * when the two are logically incompatible. Rules only ever veto a *contradiction* between number
 * and narrative - they never veto a state transition on its own, since e.g. going bankrupt is a
 * perfectly valid thing for a simulation to do.
 */
const TRANSITION_RULES: Array<(next: DeterministicState, narrativeFlavor: string) => TransitionViolation | null> = [
  (next, flavor) => {
    const bankrupt = next.cashReserves <= 0;
    const soundsFlush = /\b(record profit|strong cash position|flush with cash|financially thriving)\b/i.test(flavor);
    return bankrupt && soundsFlush
      ? { rule: "bankruptcy_lockout", message: "cashReserves <= 0 cannot coexist with a positive financial narrative_flavor." }
      : null;
  },
  (next, flavor) => {
    const systemsDown = next.serverHealthPct <= 0;
    const soundsHealthy = /\b(all systems (nominal|stable)|fully operational|no issues detected)\b/i.test(flavor);
    return systemsDown && soundsHealthy
      ? { rule: "outage_lockout", message: "serverHealthPct <= 0 cannot coexist with an 'all systems nominal' narrative_flavor." }
      : null;
  },
  (next, flavor) => {
    const maxLiability = next.legalLiabilityScore >= 100;
    const soundsClear = /\b(no legal exposure|fully compliant|case closed favorably)\b/i.test(flavor);
    return maxLiability && soundsClear
      ? { rule: "liability_lockout", message: "legalLiabilityScore >= 100 cannot coexist with a 'no legal exposure' narrative_flavor." }
      : null;
  },
  (next, flavor) => {
    const teamCollapsed = next.employeeMorale <= 0;
    const soundsThriving = /\b(morale is (high|soaring)|highly engaged team|thriving culture)\b/i.test(flavor);
    return teamCollapsed && soundsThriving
      ? { rule: "morale_lockout", message: "employeeMorale <= 0 cannot coexist with a 'thriving team' narrative_flavor." }
      : null;
  },
];

export interface ApplyDeltaResult {
  state: DeterministicState;
  violations: TransitionViolation[];
}

/**
 * Applies a (possibly partial) state delta on top of the current deterministic state. Every
 * touched field is clamped to its valid domain (see CLAMPS) so an LLM-proposed delta can never
 * push a metric out of range. Never throws - the resulting state is always well-formed even when
 * `violations` is non-empty; callers (see lib/llm/schemas.ts's requestDecisionTurn) decide whether
 * a violation should reject the turn or just get logged.
 */
export function applyStateDelta(current: DeterministicState, delta: StateDelta, narrativeFlavor: string): ApplyDeltaResult {
  const next: DeterministicState = { ...current };
  for (const key of Object.keys(delta) as Array<keyof DeterministicState>) {
    const value = delta[key];
    if (typeof value !== "number" || Number.isNaN(value)) continue;
    next[key] = clamp(key, current[key] + value);
  }

  const violations = TRANSITION_RULES.map((rule) => rule(next, narrativeFlavor)).filter(
    (violation): violation is TransitionViolation => violation !== null
  );

  return { state: next, violations };
}
