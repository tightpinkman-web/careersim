"use client";

/**
 * VC-track-specific companion to lib/telemetry/tracker.ts's generic micro-behavioral telemetry -
 * kept as a separate sessionStorage namespace rather than folded into the generic tracker, since
 * every metric here (cap-table-first discipline, slider/model-tweak iteration, FOMO reaction speed,
 * conviction under partner pushback) only makes sense for the VC Associate simulation's own
 * tool set (lib/simulation/vc-engine.ts, the Phase 2/3/4 vc/ components). Submitted alongside the
 * generic snapshot as `telemetry.vc` in the same SimulationSession.telemetry JSON column - see
 * components/results/EvaluationTrigger.tsx - so no schema change was needed to add it.
 */

export type VcToolId = "workbench" | "dataroom" | "unitEconomics" | "inbound" | "termsheet" | "partnerDefense";

interface ToolOpenedEvent {
  type: "tool_opened";
  timestamp: string;
  toolId: VcToolId;
}

interface ModelTweakEvent {
  type: "model_tweak";
  timestamp: string;
}

interface FomoTriggeredEvent {
  type: "fomo_triggered";
  timestamp: string;
}

interface FomoRespondedEvent {
  type: "fomo_responded";
  timestamp: string;
  latencySeconds: number;
}

interface PartnerConvictionEvent {
  type: "partner_conviction";
  timestamp: string;
  held: boolean;
}

type VcTelemetryEvent = ToolOpenedEvent | ModelTweakEvent | FomoTriggeredEvent | FomoRespondedEvent | PartnerConvictionEvent;

export interface VCTelemetrySnapshot {
  /** Whether the Term Sheet Builder (this simulation's cap-table tool) was the FIRST analyst tool
   *  the student opened this session, ahead of the Workbench, Data Room, Unit Economics Model,
   *  Inbound Hub, or Partner Defense Room - a proxy for structure-first vs. narrative-first
   *  analysis. Null when no tool was ever opened. */
  openedCapTableFirst: boolean | null;
  /** Count of slider/term commits across the Unit Economics Model and Term Sheet Builder - how much
   *  the student iterated on their own model rather than accepting the first numbers they saw. */
  modelTweaksCount: number;
  /** Seconds between the Inbound Hub's FOMO alert (rival term sheet) firing and the student's next
   *  real decision submission - null if FOMO never triggered, or triggered but no decision followed
   *  it before the session ended. */
  fomoPanicLatencySeconds: number | null;
  /** Whether the student held their valuation/terms after the AI Managing Partner's critique in the
   *  Defense Room, vs. revising them under pressure - null if the Defense Room was never completed. */
  partnerConvictionHeld: boolean | null;
}

function storageKey(sessionId: string): string {
  return `vc-telemetry:${sessionId}`;
}

function readEvents(sessionId: string): VcTelemetryEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(storageKey(sessionId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as VcTelemetryEvent[]) : [];
  } catch {
    return [];
  }
}

function appendEvent(sessionId: string, event: VcTelemetryEvent): void {
  if (typeof window === "undefined") return;
  try {
    const events = readEvents(sessionId);
    events.push(event);
    sessionStorage.setItem(storageKey(sessionId), JSON.stringify(events));
  } catch {
    // Best-effort only, same posture as lib/telemetry/tracker.ts.
  }
}

/** Records the first time a given analyst tool drawer is opened this session - repeat opens of a
 *  tool that was already opened before are cheap no-ops rather than growing the log forever. */
export function recordToolOpened(sessionId: string, toolId: VcToolId): void {
  const events = readEvents(sessionId);
  const alreadyOpened = events.some((e) => e.type === "tool_opened" && e.toolId === toolId);
  if (alreadyOpened) return;
  appendEvent(sessionId, { type: "tool_opened", timestamp: new Date().toISOString(), toolId });
}

/** Records one slider/term commit in the Unit Economics Model or Term Sheet Builder. */
export function recordModelTweak(sessionId: string): void {
  appendEvent(sessionId, { type: "model_tweak", timestamp: new Date().toISOString() });
}

/** Records the moment the Inbound Hub's FOMO alert fires. */
export function recordFomoTriggered(sessionId: string): void {
  appendEvent(sessionId, { type: "fomo_triggered", timestamp: new Date().toISOString() });
}

/** Records the student's next real decision submission after a FOMO trigger, computing the
 *  reaction latency - a no-op if FOMO never triggered this session, or a response was already
 *  recorded for the current trigger (so repeated decisions after the first response don't keep
 *  resetting the latency). */
export function recordFomoResponse(sessionId: string): void {
  const events = readEvents(sessionId);
  const lastTrigger = [...events].reverse().find((e): e is FomoTriggeredEvent => e.type === "fomo_triggered");
  if (!lastTrigger) return;
  const alreadyRespondedToThisTrigger = events.some(
    (e) => e.type === "fomo_responded" && new Date(e.timestamp).getTime() >= new Date(lastTrigger.timestamp).getTime()
  );
  if (alreadyRespondedToThisTrigger) return;

  const latencySeconds = Math.max(0, Math.round((Date.now() - new Date(lastTrigger.timestamp).getTime()) / 1000));
  appendEvent(sessionId, { type: "fomo_responded", timestamp: new Date().toISOString(), latencySeconds });
}

/** Records whether the student held their thesis/terms after the Managing Partner's critique in
 *  the Defense Room (lib/llm/vc-schemas.ts's VCPartnerTurn), or revised them under pressure. */
export function recordPartnerConvictionHeld(sessionId: string, held: boolean): void {
  appendEvent(sessionId, { type: "partner_conviction", timestamp: new Date().toISOString(), held });
}

/** Aggregates every VC-specific event recorded for this session. Never throws - an empty or
 *  corrupt event log just produces a snapshot of nulls/zeros. */
export function getVCTelemetrySnapshot(sessionId: string): VCTelemetrySnapshot {
  const events = readEvents(sessionId);

  const toolOpens = events.filter((e): e is ToolOpenedEvent => e.type === "tool_opened");
  const firstToolOpened = toolOpens.length > 0 ? [...toolOpens].sort((a, b) => a.timestamp.localeCompare(b.timestamp))[0] : null;
  const openedCapTableFirst = firstToolOpened ? firstToolOpened.toolId === "termsheet" : null;

  const modelTweaksCount = events.filter((e) => e.type === "model_tweak").length;

  const fomoResponses = events.filter((e): e is FomoRespondedEvent => e.type === "fomo_responded");
  const fomoPanicLatencySeconds = fomoResponses.length > 0 ? fomoResponses[fomoResponses.length - 1].latencySeconds : null;

  const convictionEvents = events.filter((e): e is PartnerConvictionEvent => e.type === "partner_conviction");
  const partnerConvictionHeld = convictionEvents.length > 0 ? convictionEvents[convictionEvents.length - 1].held : null;

  return { openedCapTableFirst, modelTweaksCount, fomoPanicLatencySeconds, partnerConvictionHeld };
}

/** Clears a session's VC-specific telemetry log - called alongside clearTelemetry once the final
 *  snapshot has been successfully submitted to /api/simulations/evaluate. */
export function clearVCTelemetry(sessionId: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(storageKey(sessionId));
  } catch {
    // Best-effort cleanup only.
  }
}
