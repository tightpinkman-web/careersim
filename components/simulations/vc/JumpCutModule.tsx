"use client";

import { AlertTriangle, TrendingUp, FastForward } from "lucide-react";
import { STARTUP_NAMES, type StartupId } from "@/lib/simulation/vc-engine";

interface JumpCutModuleProps {
  startupId: StartupId;
  /** Whether the student reviewed the Data Room Forensics canvas for this exact startup before
   *  defending the deal - passed down from VCSimulationView, which tracks it via
   *  DataRoomCanvas's onStartupViewed callback. Changes which 6-month outcome plays for CloudScale
   *  AI specifically (its red flags are survivable if diligenced properly, catastrophic if not). */
  auditedChurn: boolean;
}

/**
 * Six-Month Portfolio Jump-Cut Engine: the consequence reveal shown immediately after the Defense
 * Room, dramatizing what the deterministic financials in lib/simulation/vc-engine.ts actually imply
 * six months out. Purely narrative/illustrative - it never mutates vc-engine state or the official
 * evaluation, the same "sandbox tool" posture as every other Phase 2/3 component in this directory.
 */
export default function JumpCutModule({ startupId, auditedChurn }: JumpCutModuleProps) {
  const name = STARTUP_NAMES[startupId];

  if (startupId === "CLOUDSCALE_AI" && !auditedChurn) {
    return (
      <div className="rounded-2xl border-2 border-rose-500 bg-rose-50 p-4">
        <div className="mb-2 flex items-center gap-2 text-rose-700">
          <FastForward className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-wider">6 Months Later</span>
        </div>
        <div className="mb-3 flex items-center gap-2 rounded-md bg-rose-600 px-3 py-2 text-white">
          <AlertTriangle className="h-4 w-4 shrink-0 animate-pulse" />
          <p className="text-xs font-bold uppercase tracking-wide">Breaking: {name}&apos;s Anchor Client Cancels</p>
        </div>
        <p className="text-xs leading-relaxed text-rose-900">
          {name}&apos;s single largest enterprise customer - 72% of revenue concentration flagged in diligence - has
          declined to renew. Monthly recurring revenue drops by over half overnight, and the board is calling an
          emergency bridge round at a steep valuation haircut just to keep the lights on.
        </p>
        <div className="mt-3 rounded-md border border-rose-300 bg-white p-3">
          <p className="text-xs font-semibold text-rose-700">Emergency Bridge Call - Board Memo</p>
          <p className="mt-1 text-xs text-slate-700">
            &quot;We need a down-round bridge within 30 days or we miss payroll. This was flagged in the data room -
            we should have structured protections against concentration risk before wiring the check.&quot;
          </p>
        </div>
      </div>
    );
  }

  if (startupId === "CLOUDSCALE_AI" && auditedChurn) {
    return (
      <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-4">
        <div className="mb-2 flex items-center gap-2 text-amber-700">
          <FastForward className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-wider">6 Months Later</span>
        </div>
        <p className="text-xs leading-relaxed text-amber-900">
          The anchor client renewed - barely - after {name} renegotiated usage-based pricing the fund pushed for
          during diligence. Revenue concentration is down to 54% as two mid-market logos ramped. Still fragile, but
          the protections written into the term sheet bought real time.
        </p>
      </div>
    );
  }

  if (startupId === "CLEAN_LOGISTICS") {
    return (
      <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-50 p-4">
        <div className="mb-2 flex items-center gap-2 text-emerald-700">
          <FastForward className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-wider">6 Months Later</span>
        </div>
        <div className="mb-3 flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-white">
          <TrendingUp className="h-4 w-4 shrink-0" />
          <p className="text-xs font-bold uppercase tracking-wide">{name}: 3x Revenue Expansion</p>
        </div>
        <p className="text-xs leading-relaxed text-emerald-900">
          Steady execution against the diligenced unit economics: customer acquisition cost held flat while two new
          logistics corridors came online, tripling revenue without a corresponding jump in churn. The fund&apos;s
          ownership stake is already marking up ahead of the next round.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-slate-300 bg-slate-50 p-4">
      <div className="mb-2 flex items-center gap-2 text-slate-600">
        <FastForward className="h-4 w-4" />
        <span className="text-xs font-bold uppercase tracking-wider">6 Months Later</span>
      </div>
      <p className="text-xs leading-relaxed text-slate-700">
        {name} is tracking roughly to plan - retention held, no major surprises in either direction. A steady,
        unremarkable mark that neither validates nor punishes the thesis yet.
      </p>
    </div>
  );
}
