import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateStructured, statusForGeminiError, describeGeminiError } from "@/lib/gemini";
import { buildEvaluationPrompt, CAREER_COMPETENCY_DIMENSIONS } from "@/lib/prompts/evaluation";
import { EvaluationSchema, type Evaluation } from "@/lib/schemas/evaluation";
import { getRedisSession, clearRedisSession, type CachedTurn } from "@/lib/redis";
import type { CareerType, SimulationMode } from "@/types/simulation";

/**
 * Built entirely from data already on the session - no Gemini call - so it can never fail the
 * same way the AI evaluation can. Used whenever the Gemini evaluation call throws (quota, model
 * error, malformed JSON, timeout, schema mismatch) so the student always lands on a complete
 * scorecard instead of a dead-end error page.
 */
function buildFallbackEvaluation(
  careerType: CareerType,
  mode: SimulationMode,
  turns: { returnedState: unknown }[]
): Evaluation {
  const turnScores = turns
    .map((log) => (log.returnedState as { turnScore?: number } | null)?.turnScore)
    .filter((score): score is number => typeof score === "number");

  const overallScore =
    turnScores.length > 0
      ? Math.round(turnScores.reduce((sum, score) => sum + score, 0) / turnScores.length)
      : 50;

  const [dim1, dim2, dim3, dim4] = CAREER_COMPETENCY_DIMENSIONS[careerType][mode];

  return {
    overallScore,
    competencies: {
      [dim1]: overallScore,
      [dim2]: overallScore,
      [dim3]: overallScore,
      [dim4]: overallScore,
    },
    keyStrengths: [
      "Completed every decision point in this simulation through to the end.",
      "Engaged with a realistic, time-pressured decision flow across the full session.",
      "Built a decision history detailed enough to score objectively.",
    ],
    growthAreas: [
      "A full AI-written breakdown of this transcript wasn't available this time - overallScore reflects your average in-session performance instead.",
      "Revisit this career simulation to generate a fresh, fully detailed evaluation.",
    ],
    careerFitSummary:
      "Your detailed, AI-generated career fit narrative couldn't be produced for this session. " +
      "The score above is calculated directly from your in-session performance across every turn. " +
      "Try another run to get a full qualitative evaluation of your decision-making style.",
  };
}

/** Unguessable public id for the B2B scorecard verification route
 *  (app/verify/scorecard/[hash]) - derived from random bytes, not from the session id or any
 *  other guessable input, so knowing a sessionId never lets you derive or brute-force this. */
function generateVerificationHash(): string {
  return createHash("sha256").update(randomBytes(32)).digest("hex");
}

interface EvaluateRequestBody {
  sessionId?: string;
}

export async function POST(request: Request) {
  let body: EvaluateRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const { sessionId } = body;
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
  }

  const session = await prisma.simulationSession.findUnique({ where: { id: sessionId } });
  if (!session) {
    return NextResponse.json({ error: "No session found for the given sessionId." }, { status: 404 });
  }

  // The session's turn-by-turn history lives in Redis for the duration of an active run (see
  // app/api/simulations/action/route.ts) - this is the one point that reads it back out and
  // durably flushes it into Postgres. A cache miss (Redis not configured, a TTL eviction, or a
  // session that only ever ran with Redis down) falls back to whatever ActionLog rows the action
  // route already wrote directly, exactly as before Redis existed.
  const cached = await getRedisSession(sessionId);
  let turns: CachedTurn[];
  if (cached && cached.turns.length > 0) {
    turns = cached.turns;
  } else {
    const dbLogs = await prisma.actionLog.findMany({
      where: { sessionId: session.id },
      orderBy: { stepSequence: "asc" },
    });
    turns = dbLogs.map((log) => ({
      stepSequence: log.stepSequence,
      studentInput: log.studentInput,
      returnedState: log.returnedState,
      decisionTag: log.decisionTag,
      decisionTimeSeconds: log.decisionTimeSeconds,
    }));
  }

  if (turns.length === 0) {
    return NextResponse.json({ error: "This session has no recorded turns to evaluate." }, { status: 409 });
  }

  const { system, user } = buildEvaluationPrompt(
    session.careerType as CareerType,
    session.mode as SimulationMode,
    turns.map((turn) => ({
      stepSequence: turn.stepSequence,
      studentInput: turn.studentInput,
      returnedState: turn.returnedState,
      decisionTimeSeconds: turn.decisionTimeSeconds,
    }))
  );

  let evaluation: Evaluation;
  let usedFallback = false;
  try {
    evaluation = await generateStructured({
      system,
      turns: [{ role: "user", text: user }],
      schema: EvaluationSchema,
    });
    if (Object.keys(evaluation.competencies).length !== 4) {
      throw new Error("Evaluation did not map exactly 4 competency dimensions.");
    }
  } catch (err) {
    // Never surface a client-visible error on the final scorecard - fall back to a score
    // computed directly from the accumulated per-turn turnScore values instead.
    console.error("Evaluation generation failed, using fallback scorecard:", describeGeminiError(err), statusForGeminiError(err));
    evaluation = buildFallbackEvaluation(session.careerType as CareerType, session.mode as SimulationMode, turns);
    usedFallback = true;
  }

  // Atomic flush: replace whatever ActionLog rows exist for this session with the authoritative
  // turn history (from Redis, or re-written identically from the DB fallback above) and write the
  // final scorecard, all in one transaction, so a crash mid-flush can never leave a session with a
  // completed scorecard but a partial/duplicated turn history.
  const [, , updated] = await prisma.$transaction([
    prisma.actionLog.deleteMany({ where: { sessionId: session.id } }),
    prisma.actionLog.createMany({
      data: turns.map((turn) => ({
        sessionId: session.id,
        stepSequence: turn.stepSequence,
        studentInput: turn.studentInput,
        returnedState: turn.returnedState as object,
        decisionTag: turn.decisionTag,
        decisionTimeSeconds: turn.decisionTimeSeconds,
      })),
    }),
    prisma.simulationSession.update({
      where: { id: session.id },
      data: {
        status: "COMPLETED",
        completedAt: session.completedAt ?? new Date(),
        overallScore: evaluation.overallScore,
        competencies: evaluation.competencies,
        keyStrengths: evaluation.keyStrengths,
        growthAreas: evaluation.growthAreas,
        careerFitSummary: evaluation.careerFitSummary,
        verificationHash: session.verificationHash ?? generateVerificationHash(),
      },
    }),
  ]);

  await clearRedisSession(sessionId);

  return NextResponse.json({
    sessionId: updated.id,
    evaluation,
    verificationHash: updated.verificationHash,
    usedFallback,
  });
}
