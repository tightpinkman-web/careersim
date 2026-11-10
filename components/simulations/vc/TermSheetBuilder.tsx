"use client";

import { useMemo, useState } from "react";
import { FileSignature } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  STARTUP_IDS,
  STARTUP_NAMES,
  INITIAL_VC_STATE,
  calculateOwnershipPct,
  calculateRiskDelta,
  formatINR,
  type StartupId,
} from "@/lib/simulation/vc-engine";
import { recordModelTweak } from "@/lib/telemetry/vc-tracker";

const CR = 1_00_00_000;
const MAX_BOARD_SEATS = 2;
/** Deterministic, locally-scoped governance heuristic (NOT part of lib/simulation/vc-engine.ts's
 *  risk model, which only ever sees a startup's financials): each board seat the fund negotiates
 *  shaves a small, fixed amount off the raw financial risk score, reflecting tighter oversight.
 *  Capped so it can never offset the chosen liquidation preference's own risk bump. */
const RISK_REDUCTION_PER_BOARD_SEAT = 4;

/**
 * Term Sheet Builder for the VC Associate simulation: interactive Valuation Cap / Liquidation
 * Preference / Board Seat inputs that recompute the fund's ownership % and deal risk score live via
 * lib/simulation/vc-engine.ts's calculateOwnershipPct() and calculateRiskDelta() - the student is
 * negotiating against the startup's real (deterministic) financials, not a number this component
 * invents, so pushing for a lower valuation cap visibly increases ownership % the same way it would
 * in a real cap-table model.
 */
export default function TermSheetBuilder({ sessionId }: { sessionId?: string }) {
  const [selectedId, setSelectedId] = useState<StartupId>(STARTUP_IDS[0]);
  const baseFinancials = INITIAL_VC_STATE.startups[selectedId];

  const [valuationCapCr, setValuationCapCr] = useState(Math.round(baseFinancials.valuationCap / CR));
  const [investmentCr, setInvestmentCr] = useState(10);
  const [liquidationPreference, setLiquidationPreference] = useState<1 | 2>(baseFinancials.liquidationPreference);
  const [boardSeats, setBoardSeats] = useState(1);

  function selectStartup(id: StartupId) {
    setSelectedId(id);
    const next = INITIAL_VC_STATE.startups[id];
    setValuationCapCr(Math.round(next.valuationCap / CR));
    setLiquidationPreference(next.liquidationPreference);
  }

  const proposedFinancials = useMemo(
    () => ({
      ...baseFinancials,
      valuationCap: valuationCapCr * CR,
      liquidationPreference,
    }),
    [baseFinancials, valuationCapCr, liquidationPreference]
  );

  const ownershipPct = calculateOwnershipPct(investmentCr * CR, proposedFinancials);
  const financialRiskDelta = calculateRiskDelta(proposedFinancials);
  const riskDelta = Math.max(0, financialRiskDelta - boardSeats * RISK_REDUCTION_PER_BOARD_SEAT);

  function commitTweak() {
    if (sessionId) recordModelTweak(sessionId);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
        <FileSignature className="h-4 w-4 text-slate-500" />
        <h2 className="text-sm font-semibold text-slate-700">Term Sheet Builder</h2>
      </div>

      <div className="flex shrink-0 gap-1 border-b border-slate-100 px-3 pt-2">
        {STARTUP_IDS.map((id) => (
          <button
            key={id}
            onClick={() => selectStartup(id)}
            className={cn(
              "rounded-t-md px-3 py-1.5 text-xs font-medium transition-colors",
              selectedId === id ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"
            )}
          >
            {STARTUP_NAMES[id]}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="rounded-md bg-slate-900 p-3 text-white">
            <p className="text-xs text-slate-400">Fund Ownership</p>
            <p className="text-lg font-bold">{ownershipPct.toFixed(2)}%</p>
          </div>
          <div
            className={cn(
              "rounded-md p-3",
              riskDelta >= 60 ? "bg-rose-600 text-white" : riskDelta >= 35 ? "bg-amber-500 text-white" : "bg-emerald-600 text-white"
            )}
          >
            <p className="text-xs opacity-80">Deal Risk Score</p>
            <p className="text-lg font-bold">{riskDelta.toFixed(0)} / 100</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
              <span>Valuation Cap</span>
              <span className="font-mono text-slate-800">{formatINR(valuationCapCr * CR)}</span>
            </div>
            <input
              type="range"
              min={10}
              max={300}
              step={5}
              value={valuationCapCr}
              onChange={(e) => setValuationCapCr(parseFloat(e.target.value))}
              onPointerUp={commitTweak}
              onKeyUp={commitTweak}
              className="w-full accent-indigo-500"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
              <span>Proposed Investment</span>
              <span className="font-mono text-slate-800">{formatINR(investmentCr * CR)}</span>
            </div>
            <input
              type="range"
              min={1}
              max={100}
              step={1}
              value={investmentCr}
              onChange={(e) => setInvestmentCr(parseFloat(e.target.value))}
              onPointerUp={commitTweak}
              onKeyUp={commitTweak}
              className="w-full accent-emerald-500"
            />
          </div>

          <div>
            <p className="mb-1.5 text-xs text-slate-500">Liquidation Preference</p>
            <div className="flex gap-2">
              {([1, 2] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    setLiquidationPreference(option);
                    commitTweak();
                  }}
                  className={cn(
                    "flex-1 rounded-md border px-3 py-2 text-xs font-medium transition-colors",
                    liquidationPreference === option
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {option}x Participating Preferred
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs text-slate-500">Board Seat Allocation</p>
            <div className="flex gap-2">
              {Array.from({ length: MAX_BOARD_SEATS + 1 }, (_, n) => n).map((n) => (
                <button
                  key={n}
                  onClick={() => {
                    setBoardSeats(n);
                    commitTweak();
                  }}
                  className={cn(
                    "flex-1 rounded-md border px-3 py-2 text-xs font-medium transition-colors",
                    boardSeats === n ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {n} seat{n === 1 ? "" : "s"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
