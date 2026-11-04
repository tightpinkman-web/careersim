import { prisma } from "@/lib/prisma";
import { INITIAL_DETERMINISTIC_STATE, type DeterministicState } from "@/lib/simulation/state-machine";
import type { TriggerEvent } from "@/lib/llm/schemas";

/**
 * Replayability logging. Rather than a new table/migration, every turn's decision node + numeric
 * state snapshot + timestamp is stashed under a `__replay` key inside ActionLog.returnedState -
 * the same JSON column app/api/simulations/{start,action}/route.ts already persist on every turn -
 * so replay data travels with the turn it describes. getReplayTrace() then reconstructs the
 * ordered path straight from those rows for counselors/students to step through.
 */

export interface ReplaySnapshot {
  nodeId: string;
  stateSnapshot: DeterministicState;
  triggerEvent: TriggerEvent;
  recordedAt: string;
}

export interface ReplayAnnotatedState {
  __replay?: ReplaySnapshot;
}

/** Returns a shallow-merged copy of `returnedState` carrying this turn's replay snapshot. Pure -
 *  does not touch the database itself, so callers stay in control of when/how the result is
 *  persisted (both route handlers already write returnedState as part of their normal turn log). */
export function annotateWithReplay<T extends object>(
  returnedState: T,
  nodeId: string,
  stateSnapshot: DeterministicState,
  triggerEvent: TriggerEvent
): T & ReplayAnnotatedState {
  return {
    ...returnedState,
    __replay: {
      nodeId,
      stateSnapshot,
      triggerEvent,
      recordedAt: new Date().toISOString(),
    },
  };
}

/** Reads the deterministic state snapshot off the most recently logged turn's returnedState, for
 *  callers (app/api/simulations/action/route.ts) that need "where did the engine leave off" without
 *  replaying the whole session. Falls back to INITIAL_DETERMINISTIC_STATE for a session with no
 *  prior `__replay` annotation (e.g. one started before this layer existed), rather than throwing. */
export function getLastStateSnapshot(returnedState: unknown): DeterministicState {
  const annotated = returnedState as ReplayAnnotatedState | null | undefined;
  return annotated?.__replay?.stateSnapshot ?? INITIAL_DETERMINISTIC_STATE;
}

export interface ReplayEntry {
  stepSequence: number;
  nodeId: string;
  decisionTag: string | null;
  studentInput: string;
  stateSnapshot: DeterministicState;
  triggerEvent: TriggerEvent;
  recordedAt: string;
}

/**
 * Reconstructs the ordered replay trace for a session directly from its ActionLog rows. Turns
 * logged before this layer existed (no `__replay` annotation) are skipped rather than fabricated,
 * so an older session simply replays a shorter - but still accurate - path.
 */
export async function getReplayTrace(sessionId: string): Promise<ReplayEntry[]> {
  const logs = await prisma.actionLog.findMany({
    where: { sessionId },
    orderBy: { stepSequence: "asc" },
  });

  const trace: ReplayEntry[] = [];
  for (const log of logs) {
    const annotated = log.returnedState as ReplayAnnotatedState | null;
    const replay = annotated?.__replay;
    if (!replay) continue;
    trace.push({
      stepSequence: log.stepSequence,
      nodeId: replay.nodeId,
      decisionTag: log.decisionTag,
      studentInput: log.studentInput,
      stateSnapshot: replay.stateSnapshot,
      triggerEvent: replay.triggerEvent,
      recordedAt: replay.recordedAt,
    });
  }
  return trace;
}
