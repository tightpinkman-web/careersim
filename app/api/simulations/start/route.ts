import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateStructured, statusForGeminiError, describeGeminiError } from "@/lib/gemini";
import { getGameMasterPrompt } from "@/lib/prompts/gameMasters";
import { getAuthenticatedStudent } from "@/lib/authStudent";
import { CAREER_STATE_SCHEMAS, type CareerTypeKey } from "@/lib/schemas/simulation";
import { ageTierForMode, type AgeTier, type SimulationMode, type SimulationState } from "@/types/simulation";

const VALID_CAREER_TYPES = Object.keys(CAREER_STATE_SCHEMAS) as CareerTypeKey[];
const VALID_MODES: SimulationMode[] = ["child", "professional"];
const VALID_AGE_TIERS: AgeTier[] = ["10-12th", "college_pro"];

interface StartRequestBody {
  studentId?: string;
  anonymousSessionId?: string;
  careerType?: string;
  mode?: string;
  ageTier?: string;
}

async function resolveStudent(body: StartRequestBody) {
  const authenticatedStudent = await getAuthenticatedStudent();
  if (authenticatedStudent) return authenticatedStudent;

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

  const mode = body.mode as SimulationMode | undefined;
  if (!mode || !VALID_MODES.includes(mode)) {
    return NextResponse.json({ error: `mode must be one of: ${VALID_MODES.join(", ")}` }, { status: 400 });
  }

  const ageTier = body.ageTier as AgeTier | undefined;
  if (!ageTier || !VALID_AGE_TIERS.includes(ageTier)) {
    return NextResponse.json({ error: `ageTier must be one of: ${VALID_AGE_TIERS.join(", ")}` }, { status: 400 });
  }
  if (ageTier !== ageTierForMode(mode)) {
    return NextResponse.json(
      { error: `ageTier "${ageTier}" does not match mode "${mode}" (expected "${ageTierForMode(mode)}").` },
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
      mode,
      ageTier,
      status: "IN_PROGRESS",
    },
  });

  let state: SimulationState;
  try {
    state = (await generateStructured({
      system: getGameMasterPrompt(careerType, mode),
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
