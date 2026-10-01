import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateStructured, statusForGeminiError, describeGeminiError } from "@/lib/gemini";
import { buildEvaluationPrompt } from "@/lib/prompts/evaluation";
import { EvaluationSchema } from "@/lib/schemas/evaluation";
import type { CareerType, SimulationMode } from "@/types/simulation";

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

  let evaluation;
  try {
    evaluation = await generateStructured({
      system,
      turns: [{ role: "user", text: user }],
      schema: EvaluationSchema,
    });
  } catch (err) {
    return NextResponse.json({ error: describeGeminiError(err) }, { status: statusForGeminiError(err) });
  }

  if (Object.keys(evaluation.competencies).length !== 4) {
    return NextResponse.json(
      { error: "Evaluation did not map exactly 4 competency dimensions." },
      { status: 502 }
    );
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
  });
}
