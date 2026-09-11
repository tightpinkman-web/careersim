import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { prisma } from "@/lib/prisma";
import { getAnthropicClient, GAME_MASTER_MODEL, GAME_MASTER_MAX_TOKENS } from "@/lib/anthropic";
import { GAME_MASTER_PROMPTS } from "@/lib/prompts/gameMasters";
import { CAREER_STATE_SCHEMAS, type CareerTypeKey } from "@/lib/schemas/simulation";
import type { SimulationState } from "@/types/simulation";

const VALID_CAREER_TYPES = Object.keys(CAREER_STATE_SCHEMAS) as CareerTypeKey[];

interface StartRequestBody {
  studentId?: string;
  anonymousSessionId?: string;
  careerType?: string;
}

async function resolveStudent(body: StartRequestBody) {
  if (body.studentId) {
    const student = await prisma.student.findUnique({ where: { id: body.studentId } });
    if (!student) {
      throw new HttpError(404, "No student found for the given studentId.");
    }
    return student;
  }

  if (body.anonymousSessionId) {
    const supabaseAuthId = `anon_${body.anonymousSessionId}`;
    return prisma.student.upsert({
      where: { supabaseAuthId },
      update: {},
      create: {
        supabaseAuthId,
        email: `${supabaseAuthId}@anonymous.simulation.local`,
        name: "Anonymous Student",
      },
    });
  }

  throw new HttpError(400, "Either studentId or anonymousSessionId is required.");
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function POST(request: Request) {
  let body: StartRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const careerType = body.careerType as CareerTypeKey | undefined;
  if (!careerType || !VALID_CAREER_TYPES.includes(careerType)) {
    return NextResponse.json(
      { error: `careerType must be one of: ${VALID_CAREER_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  let student;
  try {
    student = await resolveStudent(body);
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const session = await prisma.simulationSession.create({
    data: {
      studentId: student.id,
      careerType,
      status: "IN_PROGRESS",
    },
  });

  let state: SimulationState;
  try {
    const response = await getAnthropicClient().messages.parse({
      model: GAME_MASTER_MODEL,
      max_tokens: GAME_MASTER_MAX_TOKENS,
      system: GAME_MASTER_PROMPTS[careerType],
      messages: [
        {
          role: "user",
          content:
            "[SESSION_START] Begin the simulation. Establish the scenario and generate Step 1 (currentStep: 1).",
        },
      ],
      output_config: {
        format: zodOutputFormat(CAREER_STATE_SCHEMAS[careerType]),
      },
    });

    if (!response.parsed_output) {
      throw new Error("Claude returned a response that did not parse against the expected schema.");
    }

    state = response.parsed_output as SimulationState;
  } catch (err) {
    await prisma.simulationSession.delete({ where: { id: session.id } });
    return NextResponse.json({ error: describeAnthropicError(err) }, { status: statusForAnthropicError(err) });
  }

  await prisma.actionLog.create({
    data: {
      sessionId: session.id,
      stepSequence: state.currentStep,
      studentInput: "[SESSION_START]",
      returnedState: state as object,
      decisionTag: "session_start",
    },
  });

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
  return "Unknown error generating the initial simulation state.";
}
