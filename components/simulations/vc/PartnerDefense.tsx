"use client";

import { useState } from "react";
import { Gavel, Loader2, ShieldCheck, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { STARTUP_IDS, STARTUP_NAMES, type StartupId } from "@/lib/simulation/vc-engine";
import { recordPartnerConvictionHeld } from "@/lib/telemetry/vc-tracker";
import JumpCutModule from "@/components/simulations/vc/JumpCutModule";
import type { VCPartnerTurn } from "@/lib/llm/vc-schemas";

interface PartnerDefenseProps {
  sessionId?: string;
  /** Startups the student has reviewed in the Data Room Forensics canvas this session - see
   *  VCSimulationView's onStartupViewed wiring - used to decide which Jump-Cut outcome plays once
   *  the Defense Room is complete. */
  auditedStartupIds: Set<StartupId>;
}

type DefenseState = "drafting" | "loading" | "critiqued" | "resolved";

/**
 * Investment Memo Board & AI Managing Partner Defense Room for the VC Associate simulation: the
 * student drafts a Core Thesis / Risk Audit / Valuation Proposal, submits it to the Managing
 * Partner (app/api/simulations/vc-partner-turn/route.ts, which calls lib/llm/vc-schemas.ts's
 * requestVCPartnerTurn under VCPartnerTurnSchema's rigid contract), then chooses whether to hold
 * their position or revise under the partner's pushback - which immediately rolls into the
 * Six-Month Jump-Cut revealing the consequences of that exact deal and diligence depth.
 */
export default function PartnerDefense({ sessionId, auditedStartupIds }: PartnerDefenseProps) {
  const [selectedId, setSelectedId] = useState<StartupId>(STARTUP_IDS[0]);
  const [coreThesis, setCoreThesis] = useState("");
  const [riskAudit, setRiskAudit] = useState("");
  const [valuationProposal, setValuationProposal] = useState("");
  const [defenseState, setDefenseState] = useState<DefenseState>("drafting");
  const [partnerTurn, setPartnerTurn] = useState<VCPartnerTurn | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = coreThesis.trim().length > 0 && riskAudit.trim().length > 0 && valuationProposal.trim().length > 0;

  function selectStartup(id: StartupId) {
    setSelectedId(id);
    setDefenseState("drafting");
    setPartnerTurn(null);
    setError(null);
  }

  async function submitForReview() {
    if (!canSubmit || defenseState === "loading") return;
    setDefenseState("loading");
    setError(null);
    try {
      const res = await fetch("/api/simulations/vc-partner-turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startupName: STARTUP_NAMES[selectedId],
          coreThesis,
          riskAudit,
          valuationProposal,
        }),
      });
      if (!res.ok) throw new Error("The Managing Partner couldn't review this memo. Try again.");
      const turn: VCPartnerTurn = await res.json();
      setPartnerTurn(turn);
      setDefenseState("critiqued");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong submitting the memo.");
      setDefenseState("drafting");
    }
  }

  function resolveConviction(held: boolean) {
    if (sessionId) recordPartnerConvictionHeld(sessionId, held);
    setDefenseState("resolved");
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
        <Gavel className="h-4 w-4 text-slate-500" />
        <h2 className="text-sm font-semibold text-slate-700">Investment Memo & Defense Room</h2>
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

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        {defenseState === "drafting" || defenseState === "loading" ? (
          <div className="space-y-4">
            <MemoField label="Core Thesis" value={coreThesis} onChange={setCoreThesis} placeholder="Why does this deal win?" />
            <MemoField label="Risk Audit" value={riskAudit} onChange={setRiskAudit} placeholder="What could kill this investment?" />
            <MemoField
              label="Valuation Proposal"
              value={valuationProposal}
              onChange={setValuationProposal}
              placeholder="What terms are you proposing, and why?"
            />
            {error && <p className="text-xs text-rose-600">{error}</p>}
            <button
              onClick={submitForReview}
              disabled={!canSubmit || defenseState === "loading"}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-signal px-4 py-2.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-40"
            >
              {defenseState === "loading" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Managing Partner is reviewing...
                </>
              ) : (
                "Submit to Managing Partner"
              )}
            </button>
          </div>
        ) : (
          partnerTurn && (
            <div className="space-y-4">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-700">Memo Critique</p>
                <p className="mt-1 text-xs text-slate-700">{partnerTurn.memo_critique}</p>
              </div>
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-semibold text-amber-800">Strategic Challenge</p>
                <p className="mt-1 text-xs text-amber-900">{partnerTurn.strategic_challenge}</p>
              </div>
              <div className="rounded-md border border-rose-200 bg-rose-50 p-3">
                <p className="text-xs font-semibold text-rose-800">Valuation Pushback</p>
                <p className="mt-1 text-xs text-rose-900">{partnerTurn.valuation_pushback}</p>
              </div>
              <div className="flex items-center justify-between rounded-md bg-obsidian px-3 py-2 text-white">
                <span className="text-xs">Partner Conviction</span>
                <span className="text-sm font-bold">{partnerTurn.partner_conviction_score}/100</span>
              </div>

              {defenseState === "critiqued" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => resolveConviction(true)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-signal bg-signal px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Hold Your Position
                  </button>
                  <button
                    onClick={() => resolveConviction(false)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Revise Your Terms
                  </button>
                </div>
              )}

              {defenseState === "resolved" && <JumpCutModule startupId={selectedId} auditedChurn={auditedStartupIds.has(selectedId)} />}
            </div>
          )
        )}
      </div>
    </div>
  );
}

function MemoField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-slate-600">{label}</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-[64px] w-full resize-none rounded-md border border-slate-200 p-2.5 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-signal"
      />
    </div>
  );
}
