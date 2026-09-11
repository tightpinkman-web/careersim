import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateStructured, statusForGeminiError, describeGeminiError } from "@/lib/gemini";
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
    state = (await generateStructured({
      system: GAME_MASTER_PROMPTS[careerType],
      turns: [
        {
          role: "user",
          text: "[SESSION_START] Begin the simulation. Establish the scenario and generate Step 1 (currentStep: 1).",
        },
      ],
      schema: CAREER_STATE_SCHEMAS[careerType],
    })) as SimulationState;
  } catch (err) {
    await prisma.simulationSession.delete({ where: { id: session.id } });
    return NextResponse.json({ error: describeGeminiError(err) }, { status: statusForGeminiError(err) });
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
