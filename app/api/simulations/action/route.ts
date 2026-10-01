import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateStructuredStream, describeGeminiError, type ChatTurn } from "@/lib/gemini";
import { getGameMasterPrompt } from "@/lib/prompts/gameMasters";
import { CAREER_STATE_SCHEMAS, type CareerTypeKey } from "@/lib/schemas/simulation";
import { sseResponse } from "@/lib/sse";
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

  const session = await prisma.simulationSession.findUnique({
    where: { id: sessionId },
    include: { actionLogs: { orderBy: { stepSequence: "asc" } } },
  });

  if (!session) {
    return NextResponse.json(
      { error: "No session found for the given sessionId.", code: "SESSION_NOT_FOUND" },
      { status: 404 }
    );
  }
  if (session.status === "COMPLETED") {
    return NextResponse.json(
      { error: "This simulation session has already concluded.", code: "SESSION_COMPLETED" },
      { status: 409 }
    );
  }

  const careerType = session.careerType as CareerTypeKey;
  const mode = session.mode as SimulationMode;

  const turns = buildTurns(session.actionLogs, action);
  const escalateDifficulty = shouldEscalateDifficulty(session.actionLogs);

  return sseResponse(async (send) => {
    let state: SimulationState;
    try {
      const stream = generateStructuredStream({
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
      send({ type: "error", error: describeGeminiError(err), code: "ENGINE_ERROR" });
      return;
    }

    const nextStepSequence =
      session.actionLogs.length > 0
        ? session.actionLogs[session.actionLogs.length - 1].stepSequence + 1
        : 1;

    await prisma.actionLog.create({
      data: {
        sessionId: session.id,
        stepSequence: nextStepSequence,
        studentInput: action,
        returnedState: state as object,
        decisionTag: action.slice(0, 60),
        decisionTimeSeconds: decisionTimeSeconds ?? null,
      },
    });

    if (state.isComplete) {
      await prisma.simulationSession.update({
        where: { id: session.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          overallScore: state.overallScore ?? null,
          feedbackSummary: state.feedbackSummary ?? null,
        },
      });
    }

    send({ type: "done", sessionId: session.id, state });
  });
}
