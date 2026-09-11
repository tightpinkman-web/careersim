import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { prisma } from "@/lib/prisma";
import { anthropic, GAME_MASTER_MODEL, GAME_MASTER_MAX_TOKENS } from "@/lib/anthropic";
import { GAME_MASTER_PROMPTS } from "@/lib/prompts/gameMasters";
import { CAREER_STATE_SCHEMAS, type CareerTypeKey } from "@/lib/schemas/simulation";
import type { SimulationState } from "@/types/simulation";

interface ActionRequestBody {
  sessionId?: string;
  action?: string;
}

export async function POST(request: Request) {
  let body: ActionRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const { sessionId, action } = body;
  if (!sessionId || !action || !action.trim()) {
    return NextResponse.json({ error: "sessionId and action are required." }, { status: 400 });
  }

  const session = await prisma.simulationSession.findUnique({
    where: { id: sessionId },
    include: { actionLogs: { orderBy: { stepSequence: "asc" } } },
  });

  if (!session) {
    return NextResponse.json({ error: "No session found for the given sessionId." }, { status: 404 });
  }
  if (session.status === "COMPLETED") {
    return NextResponse.json({ error: "This simulation session has already concluded." }, { status: 409 });
  }

  const careerType = session.careerType as CareerTypeKey;

  const messages: Anthropic.MessageParam[] = [];
  for (const log of session.actionLogs) {
    messages.push({ role: "user", content: log.studentInput });
    messages.push({ role: "assistant", content: JSON.stringify(log.returnedState) });
  }
  messages.push({ role: "user", content: action });

  let state: SimulationState;
  try {
    const response = await anthropic.messages.parse({
      model: GAME_MASTER_MODEL,
      max_tokens: GAME_MASTER_MAX_TOKENS,
      system: GAME_MASTER_PROMPTS[careerType],
      messages,
      output_config: {
        format: zodOutputFormat(CAREER_STATE_SCHEMAS[careerType]),
      },
    });

    if (!response.parsed_output) {
      throw new Error("Claude returned a response that did not parse against the expected schema.");
    }

    state = response.parsed_output as SimulationState;
  } catch (err) {
    return NextResponse.json({ error: describeAnthropicError(err) }, { status: statusForAnthropicError(err) });
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

  return NextResponse.json({ sessionId: session.id, state });
}

function statusForAnthropicError(err: unknown): number {
  if (err instanceof Anthropic.RateLimitError) return 429;
  if (err instanceof Anthropic.AuthenticationError) return 401;
  if (err instanceof Anthropic.BadRequestError) return 400;
  if (err instanceof Anthropic.APIError) return 502;
  return 500;
}

function describeAnthropicError(err: unknown): string {
  if (err instanceof Anthropic.APIError) return `Game Master call failed: ${err.message}`;
  if (err instanceof Error) return err.message;
  return "Unknown error generating the next simulation state.";
}
