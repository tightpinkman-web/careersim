import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateStructured, statusForGeminiError, describeGeminiError, type ChatTurn } from "@/lib/gemini";
import { getGameMasterPrompt } from "@/lib/prompts/gameMasters";
import { CAREER_STATE_SCHEMAS, type CareerTypeKey } from "@/lib/schemas/simulation";
import type { SimulationMode, SimulationState } from "@/types/simulation";

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
  const mode = session.mode as SimulationMode;

  const turns: ChatTurn[] = [];
  for (const log of session.actionLogs) {
    turns.push({ role: "user", text: log.studentInput });
    turns.push({ role: "model", text: JSON.stringify(log.returnedState) });
  }
  turns.push({ role: "user", text: action });

  let state: SimulationState;
  try {
    state = (await generateStructured({
      system: getGameMasterPrompt(careerType, mode),
      turns,
      schema: CAREER_STATE_SCHEMAS[careerType],
    })) as SimulationState;
  } catch (err) {
    return NextResponse.json({ error: describeGeminiError(err) }, { status: statusForGeminiError(err) });
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
