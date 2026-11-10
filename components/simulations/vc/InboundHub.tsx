"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import CountdownTimer from "@/components/workspace/CountdownTimer";
import { recordInformationGather } from "@/lib/telemetry/tracker";
import { STARTUP_NAMES, INITIAL_VC_STATE, type StartupId } from "@/lib/simulation/vc-engine";

const FOMO_TRIGGER_DELAY_MS = 45_000;
const FOMO_WINDOW_SECONDS = 5 * 60;
const FOMO_LABEL = "Rival Tier-1 Term Sheet Submitted: ₹12 Cr @ ₹100 Cr Valuation";

/** ₹1,20,00,00,000 -> "₹120 Cr", ₹4,20,00,000 -> "₹4.2 L" - Indian-convention short form used across
 *  the deal threads below, since the raw rupee integers in lib/simulation/vc-engine.ts are not
 *  meant to be displayed as-is. */
function formatINR(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(abs >= 10_00_00_000 ? 0 : 1)} Cr`;
  if (abs >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(1)} L`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

interface DealThread {
  startupId: StartupId;
  subject: string;
  preview: string;
}

const DEAL_THREADS: DealThread[] = [
  { startupId: "CLOUDSCALE_AI", subject: "Re: CloudScale AI - Series A Data Room Access", preview: "Founders pushing for a decision this week; data room attached." },
  { startupId: "ENTERPRISE_MESH", subject: "Enterprise Mesh - Updated Cohort Retention Numbers", preview: "CFO sent revised churn and net-revenue-retention figures." },
  { startupId: "CLEAN_LOGISTICS", subject: "CleanLogistics - Term Sheet Redlines Attached", preview: "Legal counsel flagged two clauses on the liquidation preference." },
];

/**
 * Inbound Communications Hub for the VC Associate simulation: a triage-style inbox of live deal
 * threads for the fixed CloudScale AI / Enterprise Mesh / CleanLogistics cohort, with every metric
 * sourced directly from the deterministic lib/simulation/vc-engine.ts state - never restated or
 * invented here - plus a FOMO Engine that escalates a rival term-sheet alert 45 seconds into the
 * session to pressure a faster read.
 */
export default function InboundHub({ sessionId, onFomoExpire }: { sessionId?: string; onFomoExpire?: () => void }) {
  const [selectedId, setSelectedId] = useState<StartupId>(DEAL_THREADS[0].startupId);
  const [fomoTriggered, setFomoTriggered] = useState(false);
  const onFomoExpireRef = useRef(onFomoExpire);
  // eslint-disable-next-line react-hooks/refs -- latest-callback ref, intentionally written every render
  onFomoExpireRef.current = onFomoExpire;

  useEffect(() => {
    const timeout = setTimeout(() => setFomoTriggered(true), FOMO_TRIGGER_DELAY_MS);
    return () => clearTimeout(timeout);
  }, []);

  const selectedThread = DEAL_THREADS.find((t) => t.startupId === selectedId) ?? DEAL_THREADS[0];
  const financials = INITIAL_VC_STATE.startups[selectedThread.startupId];

  function selectThread(startupId: StartupId) {
    setSelectedId(startupId);
    if (sessionId) recordInformationGather(sessionId, "email", `deal-thread-${startupId}`);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <AnimatePresence>
        {fomoTriggered && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="shrink-0 border-b border-red-500/40 bg-red-500/10 p-3"
          >
            <CountdownTimer
              anchorKey="rival-term-sheet"
              label={FOMO_LABEL}
              durationSeconds={FOMO_WINDOW_SECONDS}
              onExpire={() => onFomoExpireRef.current?.()}
              className="w-full"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
        <Inbox className="h-4 w-4 text-slate-500" />
        <h2 className="text-sm font-semibold text-slate-700">Inbound Deal Threads</h2>
        <span className="ml-auto text-xs text-slate-400">{DEAL_THREADS.length} active</span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
        <ul className="max-h-40 w-full shrink-0 overflow-y-auto border-b border-slate-100 sm:max-h-none sm:w-2/5 sm:border-b-0 sm:border-r">
          {DEAL_THREADS.map((thread) => (
            <li key={thread.startupId}>
              <button
                onClick={() => selectThread(thread.startupId)}
                className={cn(
                  "w-full border-b border-slate-100 px-3 py-2.5 text-left transition-colors",
                  selectedId === thread.startupId ? "bg-indigo-50" : "hover:bg-slate-50"
                )}
              >
                <p className="truncate text-xs font-semibold text-slate-900">{STARTUP_NAMES[thread.startupId]}</p>
                <p className="truncate text-xs text-slate-600">{thread.subject}</p>
                <p className="truncate text-[11px] text-slate-400">{thread.preview}</p>
              </button>
            </li>
          ))}
        </ul>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <h3 className="text-sm font-semibold text-slate-900">{STARTUP_NAMES[selectedThread.startupId]}</h3>
          <p className="mt-1 text-xs text-slate-500">{selectedThread.subject}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Metric label="Valuation Cap" value={formatINR(financials.valuationCap)} />
            <Metric label="Annual Revenue" value={formatINR(financials.annualRevenue)} />
            <Metric label="Churn Rate" value={`${financials.churnRate}%`} />
            <Metric label="Revenue Concentration" value={`${financials.revenueConcentration}%`} />
            <Metric label="CAC" value={formatINR(financials.cac)} />
            <Metric label="LTV" value={formatINR(financials.ltv)} />
            <Metric label="Liquidation Preference" value={`${financials.liquidationPreference}x`} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
