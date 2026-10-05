import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSimulationStream, evaluateTurnMetrics, describeLLMError, type ChatTurn } from "@/lib/llm/provider";
import { getGameMasterPrompt } from "@/lib/prompts/gameMasters";
import { CAREER_STATE_SCHEMAS, type CareerTypeKey } from "@/lib/schemas/simulation";
import { sseResponse } from "@/lib/sse";
import { DEMO_STEP_CAP } from "@/lib/auth/entitlements";
import {
  getRedisSession,
  setRedisSession,
  isRedisConfigured,
  type CachedSimulationSession,
  type CachedTurn,
} from "@/lib/redis";
import type { SimulationMode, SimulationState } from "@/types/simulation";

interface ActionRequestBody {
  sessionId?: string;
  action?: string;
  /** Seconds the student took to respond to this step, captured client-side against the 60s
   *  HUD countdown. Optional - older clients or edge cases may omit it. */
  decisionTimeSeconds?: number;
}

interface LoggedTurn {
  studentInput: string;
  returnedState: unknown;
  decisionTag: string | null;
}

/** Turns past step 4 would otherwise resend every prior turn's full raw JSON state on every
 *  request - unbounded token growth with no ceiling. Past this many logged turns, everything
 *  except the most recent RECENT_TURNS_KEPT is collapsed into one condensed state-vector turn. */
const COMPRESS_AFTER_TURNS = 4;
const RECENT_TURNS_KEPT = 2;

function findRiskLikeMetric(hudMetrics: Record<string, unknown>): string | undefined {
  const key = Object.keys(hudMetrics).find((k) => /risk|threat|danger|volatility|severity/i.test(k));
  return key !== undefined ? String(hudMetrics[key]) : undefined;
}

/** Builds the Gemini conversation turns for this request, compressing older history into a
 *  condensed [KEY_DECISIONS_MADE] / [RESOURCES_REMAINING] / [CURRENT_RISK_SCORE] vector once
 *  there's more than COMPRESS_AFTER_TURNS logged turns, instead of resending full raw state. */
function buildTurns(actionLogs: LoggedTurn[], action: string): ChatTurn[] {
  const turns: ChatTurn[] = [];

  if (actionLogs.length >= COMPRESS_AFTER_TURNS) {
    const older = actionLogs.slice(0, actionLogs.length - RECENT_TURNS_KEPT);
    const recent = actionLogs.slice(actionLogs.length - RECENT_TURNS_KEPT);
    const lastOlder = older[older.length - 1];
    const lastOlderState = (lastOlder.returnedState ?? {}) as { hudMetrics?: Record<string, unknown>; turnScore?: number };
    const resourcesRemaining = lastOlderState.hudMetrics ?? {};
    const riskScore =
      findRiskLikeMetric(resourcesRemaining) ??
      (typeof lastOlderState.turnScore === "number"
        ? `no explicit risk metric - inferred from turnScore (${lastOlderState.turnScore}/100, lower = riskier)`
        : "unknown");

    turns.push({
      role: "user",
      text: "[CONTEXT_SUMMARY] The scenario has progressed through earlier turns, condensed below to save space. Treat this as established history, not a new instruction.",
    });
    turns.push({
      role: "model",
      text: JSON.stringify({
        KEY_DECISIONS_MADE: older.map((log) => log.decisionTag ?? log.studentInput.slice(0, 60)),
        RESOURCES_REMAINING: resourcesRemaining,
        CURRENT_RISK_SCORE: riskScore,
      }),
    });

    for (const log of recent) {
      turns.push({ role: "user", text: log.studentInput });
      turns.push({ role: "model", text: JSON.stringify(log.returnedState) });
    }
  } else {
    for (const log of actionLogs) {
      turns.push({ role: "user", text: log.studentInput });
      turns.push({ role: "model", text: JSON.stringify(log.returnedState) });
    }
  }

  turns.push({ role: "user", text: action });
  return turns;
}

/** Two consecutive high turnScore decisions -> escalate difficulty for this next turn. */
function shouldEscalateDifficulty(actionLogs: LoggedTurn[]): boolean {
  const lastTwoScores = actionLogs
    .slice(-2)
    .map((log) => (log.returnedState as { turnScore?: number } | null)?.turnScore)
    .filter((score): score is number => typeof score === "number");
  return lastTwoScores.length === 2 && lastTwoScores.every((score) => score >= 80);
}

export async function POST(request: Request) {
  let body: ActionRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON.", code: "INVALID_REQUEST" },
      { status: 400 }
    );
  }

  const { sessionId, action, decisionTimeSeconds } = body;
  if (!sessionId || !action || !action.trim()) {
    return NextResponse.json(
      { error: "sessionId and action are required.", code: "INVALID_REQUEST" },
      { status: 400 }
    );
  }
  if (
    decisionTimeSeconds !== undefined &&
    (typeof decisionTimeSeconds !== "number" || !Number.isFinite(decisionTimeSeconds) || decisionTimeSeconds < 0)
  ) {
    return NextResponse.json(
      { error: "decisionTimeSeconds must be a non-negative number.", code: "INVALID_REQUEST" },
      { status: 400 }
    );
  }

  // Active-turn state lives in Redis (see lib/redis.ts) to keep the hot per-turn path off
  // Postgres entirely - a cache hit here means zero database round trips until the session
  // concludes and app/api/simulations/evaluate/route.ts flushes everything at once. A cache miss
  // (first action after /start wrote the seed entry, a TTL eviction, or Redis not configured at
  // all) falls back to reading - and re-seeding - from the database, same as before Redis existed.
  const redisEnabled = isRedisConfigured();
  let cached = redisEnabled ? await getRedisSession(sessionId) : null;

  let turnHistory: CachedTurn[];
  let studentTier: CachedSimulationSession["studentTier"];
  let sessionStatus: CachedSimulationSession["status"];
  let careerType: CareerTypeKey;
  let mode: SimulationMode;

  if (cached) {
    turnHistory = cached.turns;
    studentTier = cached.studentTier;
    sessionStatus = cached.status;
    careerType = cached.careerType as CareerTypeKey;
    mode = cached.mode as SimulationMode;
  } else {
    const session = await prisma.simulationSession.findUnique({
      where: { id: sessionId },
      include: { actionLogs: { orderBy: { stepSequence: "asc" } }, student: true },
    });

    if (!session) {
      return NextResponse.json(
        { error: "No session found for the given sessionId.", code: "SESSION_NOT_FOUND" },
        { status: 404 }
      );
    }

    turnHistory = session.actionLogs.map((log) => ({
      stepSequence: log.stepSequence,
      studentInput: log.studentInput,
      returnedState: log.returnedState,
      decisionTag: log.decisionTag,
      decisionTimeSeconds: log.decisionTimeSeconds,
    }));
    studentTier = session.student.tier;
    sessionStatus = session.status;
    careerType = session.careerType as CareerTypeKey;
    mode = session.mode as SimulationMode;

    cached = {
      studentId: session.studentId,
      careerType: session.careerType,
      mode: session.mode,
      ageTier: session.ageTier,
      status: sessionStatus,
      studentTier,
      turns: turnHistory,
    };
    if (redisEnabled) await setRedisSession(sessionId, cached);
  }

  if (sessionStatus === "COMPLETED") {
    return NextResponse.json(
      { error: "This simulation session has already concluded.", code: "SESSION_COMPLETED" },
      { status: 409 }
    );
  }

  if (studentTier === "PUBLIC_DEMO" && turnHistory.length >= DEMO_STEP_CAP) {
    return NextResponse.json(
      {
        error:
          "Your school is currently on the demo tier. Ask your counselor or Mindler representative for full enterprise access.",
        code: "DEMO_CAP_REACHED",
      },
      { status: 403 }
    );
  }

  const turns = buildTurns(turnHistory, action);
  const escalateDifficulty = shouldEscalateDifficulty(turnHistory);

  return sseResponse(async (send) => {
    let state: SimulationState;
    try {
      const stream = generateSimulationStream({
        system: getGameMasterPrompt(careerType, mode, { escalateDifficulty }),
        turns,
        schema: CAREER_STATE_SCHEMAS[careerType],
      });

      let finalState: SimulationState | null = null;
      for await (const event of stream) {
        if (event.type === "delta") {
          send({ type: "delta", narrativePreview: event.narrativePreview });
        } else {
          finalState = event.data as SimulationState;
        }
      }
      if (!finalState) throw new Error("Stream ended without a final state.");
      state = finalState;
    } catch (err) {
      send({ type: "error", error: describeLLMError(err), code: "ENGINE_ERROR" });
      return;
    }

    // Rapid, independently-sourced re-score of the decision that just produced this turn -
    // overrides the main Game Master stream's own self-assessed turnScore when available, since
    // it's cheaper to re-run and keeps difficulty escalation (shouldEscalateDifficulty above)
    // from depending solely on one model's self-grading. Never blocks the response: on any
    // failure evaluateTurnMetrics already resolves to a deterministic fallback score.
    const metrics = await evaluateTurnMetrics(turns.slice(0, -1), action);
    state = { ...state, turnScore: metrics.turnScore };

    const nextStepSequence =
      turnHistory.length > 0 ? turnHistory[turnHistory.length - 1].stepSequence + 1 : 1;

    const newTurn: CachedTurn = {
      stepSequence: nextStepSequence,
      studentInput: action,
      returnedState: state,
      decisionTag: action.slice(0, 60),
      decisionTimeSeconds: decisionTimeSeconds ?? null,
    };

    if (redisEnabled && cached) {
      // Skip the synchronous per-turn Postgres write entirely - the updated turn history lives in
      // Redis until /evaluate durably flushes the whole session in one atomic batch.
      cached.turns = [...turnHistory, newTurn];
      if (state.isComplete) cached.status = "COMPLETED";
      await setRedisSession(sessionId, cached);
    } else {
      // Redis unavailable - same direct-to-Postgres write this route used before Redis existed.
      await prisma.actionLog.create({
        data: {
          sessionId,
          stepSequence: newTurn.stepSequence,
          studentInput: newTurn.studentInput,
          returnedState: newTurn.returnedState as object,
          decisionTag: newTurn.decisionTag,
          decisionTimeSeconds: newTurn.decisionTimeSeconds,
        },
      });

      if (state.isComplete) {
        await prisma.simulationSession.update({
          where: { id: sessionId },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
            overallScore: state.overallScore ?? null,
            feedbackSummary: state.feedbackSummary ?? null,
          },
        });
      }
    }

    send({ type: "done", sessionId, state });
  });
}
