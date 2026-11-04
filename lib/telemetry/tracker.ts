"use client";

/**
 * Micro-behavioral telemetry tracker: a client-only, sessionStorage-backed event log capturing
 * signal the Game Master's narrative state never carries - how long a student actually took to
 * decide, which pieces of supplied evidence (emails, SIEM logs, contract exhibits) they opened
 * before deciding, and how often they changed strategic direction mid-run. Nothing here touches the
 * simulation engine or scoring; it's purely observational, aggregated once via getTelemetrySnapshot
 * and submitted alongside the final /evaluate call (see components/results/EvaluationTrigger.tsx)
 * for components/results/CounselorDebriefReport.tsx to turn into coaching material.
 */

export type InformationGatherKind = "email" | "log" | "exhibit";

interface DecisionTimingEvent {
  type: "decision_timing";
  timestamp: string;
  stepSequence: number;
  seconds: number;
}

interface InformationGatherEvent {
  type: "information_gather";
  timestamp: string;
  kind: InformationGatherKind;
  targetId: string;
}

interface StrategicPivotEvent {
  type: "strategic_pivot";
  timestamp: string;
  stepSequence: number;
  fromActionKind: string;
  toActionKind: string;
}

type TelemetryEvent = DecisionTimingEvent | InformationGatherEvent | StrategicPivotEvent;

export interface TelemetrySnapshot {
  decisionTimings: { stepSequence: number; seconds: number }[];
  averageDecisionSeconds: number;
  medianDecisionSeconds: number;
  informationGatherCounts: Record<InformationGatherKind, number>;
  totalInformationGatherEvents: number;
  strategicPivots: { stepSequence: number; fromActionKind: string; toActionKind: string }[];
  strategicPivotCount: number;
}

function storageKey(sessionId: string): string {
  return `telemetry:${sessionId}`;
}

function readEvents(sessionId: string): TelemetryEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(storageKey(sessionId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TelemetryEvent[]) : [];
  } catch {
    return [];
  }
}

function appendEvent(sessionId: string, event: TelemetryEvent): void {
  if (typeof window === "undefined") return;
  try {
    const events = readEvents(sessionId);
    events.push(event);
    sessionStorage.setItem(storageKey(sessionId), JSON.stringify(events));
  } catch {
    // sessionStorage unavailable (private browsing, quota, etc.) - telemetry is best-effort only,
    // never something a decision/interaction should block or throw over.
  }
}

/** Records how long the student took to submit this step's decision - the counterpart to
 *  ActionLog.decisionTimeSeconds, kept here too so the full per-step timing distribution (not just
 *  the value sent for the current step) is available for the debrief pack's cognitive profile. */
export function recordDecisionTiming(sessionId: string, stepSequence: number, seconds: number): void {
  appendEvent(sessionId, { type: "decision_timing", timestamp: new Date().toISOString(), stepSequence, seconds });
}

/** Records an information-gathering interaction - opening an email, inspecting a SIEM log/alert,
 *  or reviewing a contract exhibit/clause - before the student acts on it. `targetId` is whatever
 *  id the source payload already uses (email.id, alert.id, clause.id, ...). */
export function recordInformationGather(sessionId: string, kind: InformationGatherKind, targetId: string): void {
  appendEvent(sessionId, { type: "information_gather", timestamp: new Date().toISOString(), kind, targetId });
}

/** Records a strategic pivot: consecutive decisions whose AllowedAction.kind differs (e.g.
 *  "primary" -> "danger"), used as a grounded proxy for changing approach mid-scenario rather than
 *  committing to one strategy. */
export function recordStrategicPivot(sessionId: string, stepSequence: number, fromActionKind: string, toActionKind: string): void {
  appendEvent(sessionId, {
    type: "strategic_pivot",
    timestamp: new Date().toISOString(),
    stepSequence,
    fromActionKind,
    toActionKind,
  });
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** Aggregates every event recorded for this session into a single snapshot - the shape persisted
 *  to SimulationSession.telemetry and read by CounselorDebriefReport. Never throws: an empty or
 *  corrupt event log just produces a snapshot of all zeros. */
export function getTelemetrySnapshot(sessionId: string): TelemetrySnapshot {
  const events = readEvents(sessionId);

  const decisionTimings = events
    .filter((e): e is DecisionTimingEvent => e.type === "decision_timing")
    .map((e) => ({ stepSequence: e.stepSequence, seconds: e.seconds }));
  const seconds = decisionTimings.map((t) => t.seconds);

  const informationGatherCounts: Record<InformationGatherKind, number> = { email: 0, log: 0, exhibit: 0 };
  let totalInformationGatherEvents = 0;
  for (const event of events) {
    if (event.type === "information_gather") {
      informationGatherCounts[event.kind] += 1;
      totalInformationGatherEvents += 1;
    }
  }

  const strategicPivots = events
    .filter((e): e is StrategicPivotEvent => e.type === "strategic_pivot")
    .map((e) => ({ stepSequence: e.stepSequence, fromActionKind: e.fromActionKind, toActionKind: e.toActionKind }));

  return {
    decisionTimings,
    averageDecisionSeconds: seconds.length > 0 ? Math.round(seconds.reduce((a, b) => a + b, 0) / seconds.length) : 0,
    medianDecisionSeconds: Math.round(median(seconds)),
    informationGatherCounts,
    totalInformationGatherEvents,
    strategicPivots,
    strategicPivotCount: strategicPivots.length,
  };
}

/** Clears a session's telemetry log - called once the final snapshot has been successfully
 *  submitted to /api/simulations/evaluate, so a retried evaluation call doesn't resubmit stale
 *  events from a prior attempt. */
export function clearTelemetry(sessionId: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(storageKey(sessionId));
  } catch {
    // Best-effort cleanup only.
  }
}
