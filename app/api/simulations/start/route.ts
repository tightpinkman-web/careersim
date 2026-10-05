import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedStudent } from "@/lib/authStudent";
import { generateSimulationStream, describeLLMError } from "@/lib/llm/provider";
import { getGameMasterPrompt } from "@/lib/prompts/gameMasters";
import { CAREER_STATE_SCHEMAS, type CareerTypeKey } from "@/lib/schemas/simulation";
import { sseResponse } from "@/lib/sse";
import { ageTierForMode, type AgeTier, type SimulationMode, type SimulationState } from "@/types/simulation";
import { PARTNER_REF_COOKIE } from "@/lib/partnerRef";

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

/** Prefers the real, signed-in Student (so a logged-in user's new sessions attach to their real
 *  account instead of fragmenting back into a fresh anonymous row - see sync-student/route.ts
 *  for the one-time backfill of any PRIOR anonymous sessions onto that same real account).
 *  Falls back to the anonymous/guest flow only when there's no authenticated session. */
async function resolveStudent(body: StartRequestBody) {
  const authenticated = await getAuthenticatedStudent();
  if (authenticated) return authenticated;

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

export async function POST(request: NextRequest) {
  let body: StartRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON.", code: "INVALID_REQUEST" },
      { status: 400 }
    );
  }

  const careerType = body.careerType as CareerTypeKey | undefined;
  if (!careerType || !VALID_CAREER_TYPES.includes(careerType)) {
    return NextResponse.json(
      { error: `careerType must be one of: ${VALID_CAREER_TYPES.join(", ")}`, code: "INVALID_REQUEST" },
      { status: 400 }
    );
  }

  const mode = body.mode as SimulationMode | undefined;
  if (!mode || !VALID_MODES.includes(mode)) {
    return NextResponse.json(
      { error: `mode must be one of: ${VALID_MODES.join(", ")}`, code: "INVALID_REQUEST" },
      { status: 400 }
    );
  }

  const ageTier = body.ageTier as AgeTier | undefined;
  if (!ageTier || !VALID_AGE_TIERS.includes(ageTier)) {
    return NextResponse.json(
      { error: `ageTier must be one of: ${VALID_AGE_TIERS.join(", ")}`, code: "INVALID_REQUEST" },
      { status: 400 }
    );
  }
  if (ageTier !== ageTierForMode(mode)) {
    return NextResponse.json(
      {
        error: `ageTier "${ageTier}" does not match mode "${mode}" (expected "${ageTierForMode(mode)}").`,
        code: "INVALID_REQUEST",
      },
      { status: 400 }
    );
  }

  let student;
  try {
    student = await resolveStudent(body);
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message, code: "INVALID_REQUEST" }, { status: err.status });
    }
    throw err;
  }

  const partnerRef = request.cookies.get(PARTNER_REF_COOKIE)?.value ?? null;

  const session = await prisma.simulationSession.create({
    data: {
      studentId: student.id,
      careerType,
      mode,
      ageTier,
      status: "IN_PROGRESS",
      partnerRef,
    },
  });

  return sseResponse(async (send) => {
    let state: SimulationState;
    try {
      const stream = generateSimulationStream({
        system: getGameMasterPrompt(careerType, mode),
        turns: [
          {
            role: "user",
            text: "[SESSION_START] Begin the simulation. Establish the scenario and generate Step 1 (currentStep: 1).",
          },
        ],
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
      await prisma.simulationSession.delete({ where: { id: session.id } });
      send({ type: "error", error: describeLLMError(err), code: "ENGINE_ERROR" });
      return;
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

    send({ type: "done", sessionId: session.id, state });
  });
}
