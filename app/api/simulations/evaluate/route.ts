import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateStructured, statusForGeminiError, describeGeminiError } from "@/lib/gemini";
import { buildEvaluationPrompt, CAREER_COMPETENCY_DIMENSIONS } from "@/lib/prompts/evaluation";
import { EvaluationSchema, type Evaluation } from "@/lib/schemas/evaluation";
import type { ActionLog } from "@prisma/client";
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
  actionLogs: Pick<ActionLog, "returnedState">[]
): Evaluation {
  const turnScores = actionLogs
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

  const session = await prisma.simulationSession.findUnique({
    where: { id: sessionId },
    include: { actionLogs: { orderBy: { stepSequence: "asc" } } },
  });

  if (!session) {
    return NextResponse.json({ error: "No session found for the given sessionId." }, { status: 404 });
  }
  if (session.actionLogs.length === 0) {
    return NextResponse.json({ error: "This session has no recorded turns to evaluate." }, { status: 409 });
  }

  const { system, user } = buildEvaluationPrompt(
    session.careerType as CareerType,
    session.mode as SimulationMode,
    session.actionLogs.map((log) => ({
      stepSequence: log.stepSequence,
      studentInput: log.studentInput,
      returnedState: log.returnedState,
      decisionTimeSeconds: log.decisionTimeSeconds,
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
    evaluation = buildFallbackEvaluation(
      session.careerType as CareerType,
      session.mode as SimulationMode,
      session.actionLogs
    );
    usedFallback = true;
  }

  const updated = await prisma.simulationSession.update({
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
  });

  return NextResponse.json({
    sessionId: updated.id,
    evaluation,
    verificationHash: updated.verificationHash,
    usedFallback,
  });
}
