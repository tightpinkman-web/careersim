import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { prisma } from "@/lib/prisma";
import { getAnthropicClient, GAME_MASTER_MODEL, GAME_MASTER_MAX_TOKENS } from "@/lib/anthropic";
import { buildEvaluationPrompt } from "@/lib/prompts/evaluation";
import { EvaluationSchema } from "@/lib/schemas/evaluation";
import type { CareerType } from "@/types/simulation";

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
    session.actionLogs.map((log) => ({
      stepSequence: log.stepSequence,
      studentInput: log.studentInput,
      returnedState: log.returnedState,
    }))
  );

  let evaluation;
  try {
    const response = await getAnthropicClient().messages.parse({
      model: GAME_MASTER_MODEL,
      max_tokens: GAME_MASTER_MAX_TOKENS,
      system,
      messages: [{ role: "user", content: user }],
      output_config: {
        format: zodOutputFormat(EvaluationSchema),
      },
    });

    if (!response.parsed_output) {
      throw new Error("Claude returned a response that did not parse against the evaluation schema.");
    }

    evaluation = response.parsed_output;
  } catch (err) {
    return NextResponse.json({ error: describeAnthropicError(err) }, { status: statusForAnthropicError(err) });
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
    },
  });

  return NextResponse.json({
    sessionId: updated.id,
    evaluation,
  });
}

function statusForAnthropicError(err: unknown): number {
  if (err instanceof Anthropic.RateLimitError) return 429;
  if (err instanceof Anthropic.AuthenticationError) return 401;
  if (err instanceof Anthropic.BadRequestError) return 400;
  if (err instanceof Anthropic.APIError) return 502;
  return 500;
}

function describeAnthropicError(err: unknown): string {
  if (err instanceof Anthropic.APIError) return `Evaluation call failed: ${err.message}`;
  if (err instanceof Error) return err.message;
  return "Unknown error generating the evaluation.";
}
