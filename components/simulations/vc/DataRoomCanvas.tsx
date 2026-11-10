"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import { recordInformationGather } from "@/lib/telemetry/tracker";
import { STARTUP_IDS, STARTUP_NAMES, INITIAL_VC_STATE, formatINR, type StartupId, type StartupFinancials } from "@/lib/simulation/vc-engine";

interface CohortRow {
  customer: string;
  revenueShare: number;
  status: "Active" | "Churned (last 2 quarters)";
}

const COHORT_SIZE = 8;

/**
 * Deterministically derives a raw per-customer cohort table from a startup's aggregate financials
 * - no randomness, so the same startup always produces the same rows (replayable, matching the
 * Deterministic State Engine's philosophy). The top customer's revenue share is pinned to
 * `revenueConcentration` (surfacing single-client concentration risk directly in the row data
 * rather than just as a summary stat), the remaining revenue is split evenly across the rest of the
 * cohort, and the first `round(churnRate / 100 * (COHORT_SIZE - 1))` non-top customers are marked
 * churned so the raw table visibly substantiates the churn percentage instead of just asserting it.
 */
function deriveCohortRows(financials: StartupFinancials): CohortRow[] {
  const remainingShare = Math.max(0, 100 - financials.revenueConcentration);
  const othersCount = COHORT_SIZE - 1;
  const perOtherShare = othersCount > 0 ? remainingShare / othersCount : 0;
  const churnedCount = Math.min(othersCount, Math.round((financials.churnRate / 100) * othersCount));

  const rows: CohortRow[] = [
    { customer: "Client 01 (Anchor Account)", revenueShare: financials.revenueConcentration, status: "Active" },
  ];
  for (let i = 0; i < othersCount; i++) {
    rows.push({
      customer: `Client ${String(i + 2).padStart(2, "0")}`,
      revenueShare: Math.round(perOtherShare * 10) / 10,
      status: i < churnedCount ? "Churned (last 2 quarters)" : "Active",
    });
  }
  return rows;
}

/**
 * Data Room Forensics Canvas for the VC Associate simulation: raw, row-level customer cohort
 * tables for each of the three deal candidates, generated directly from their
 * lib/simulation/vc-engine.ts financials rather than restated narrative copy. Surfaces the two
 * due-diligence traps baked into CloudScale AI's numbers - 38% annual churn and 72% single-client
 * revenue concentration - as explicit flags once that startup is selected, the way a real forensic
 * pass over raw data (not just a summary deck) would.
 */
export default function DataRoomCanvas({
  sessionId,
  onStartupViewed,
}: {
  sessionId?: string;
  /** Called whenever a startup's raw cohort data is shown here (including the initially-selected
   *  one on mount) - lets VCSimulationView track which deals were actually diligenced this session,
   *  independent of which one ends up backed in the Defense Room's Jump-Cut outcome. */
  onStartupViewed?: (id: StartupId) => void;
}) {
  const [selectedId, setSelectedId] = useState<StartupId>(STARTUP_IDS[0]);
  const financials = INITIAL_VC_STATE.startups[selectedId];
  const rows = useMemo(() => deriveCohortRows(financials), [financials]);

  const highChurn = financials.churnRate >= 25;
  const highConcentration = financials.revenueConcentration >= 50;

  useEffect(() => {
    onStartupViewed?.(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires once per distinct startup shown, not on every onStartupViewed identity change
  }, [selectedId]);

  function selectStartup(id: StartupId) {
    setSelectedId(id);
    if (sessionId) recordInformationGather(sessionId, "exhibit", `data-room-${id}`);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
        <Database className="h-4 w-4 text-slate-500" />
        <h2 className="text-sm font-semibold text-slate-700">Data Room Forensics</h2>
      </div>

      <div className="flex shrink-0 gap-1 border-b border-slate-100 px-3 pt-2">
        {STARTUP_IDS.map((id) => (
          <button
            key={id}
            onClick={() => selectStartup(id)}
            className={cn(
              "rounded-t-md px-3 py-1.5 text-xs font-medium transition-colors",
              selectedId === id ? "bg-obsidian text-white" : "text-slate-500 hover:bg-slate-100"
            )}
          >
            {STARTUP_NAMES[id]}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-8">
        {(highChurn || highConcentration) && (
          <div className="mb-3 flex flex-col gap-1.5 rounded-md border border-rose-300 bg-rose-50 p-3 text-xs text-rose-700">
            <div className="flex items-center gap-1.5 font-semibold">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Diligence flags
            </div>
            {highChurn && <p>Annual churn is {financials.churnRate}% - well above a healthy SaaS benchmark.</p>}
            {highConcentration && (
              <p>The anchor account alone accounts for {financials.revenueConcentration}% of total revenue.</p>
            )}
          </div>
        )}

        <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md bg-slate-50 p-2.5">
            <p className="text-slate-500">Annual Revenue</p>
            <p className="font-semibold text-slate-900">{formatINR(financials.annualRevenue)}</p>
          </div>
          <div className="rounded-md bg-slate-50 p-2.5">
            <p className="text-slate-500">Valuation Cap</p>
            <p className="font-semibold text-slate-900">{formatINR(financials.valuationCap)}</p>
          </div>
        </div>

        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="pb-1.5 font-medium">Customer</th>
              <th className="pb-1.5 font-medium">Revenue Share</th>
              <th className="pb-1.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.customer} className="border-b border-slate-100">
                <td className="py-1.5 text-slate-800">{row.customer}</td>
                <td className="py-1.5 font-mono text-slate-800">{row.revenueShare}%</td>
                <td className={cn("py-1.5", row.status === "Active" ? "text-emerald-600" : "text-rose-600")}>{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
