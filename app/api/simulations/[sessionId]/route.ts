import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { SimulationState } from "@/types/simulation";

export async function GET(_request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;

  const session = await prisma.simulationSession.findUnique({
    where: { id: sessionId },
    include: {
      actionLogs: {
        orderBy: { stepSequence: "desc" },
        take: 1,
      },
    },
  });

  if (!session) {
    return NextResponse.json(
      { error: "No session found for the given sessionId.", code: "SESSION_NOT_FOUND" },
      { status: 404 }
    );
  }

  const latestLog = session.actionLogs[0];
  if (!latestLog) {
    return NextResponse.json(
      { error: "Session has no recorded state yet.", code: "SESSION_NOT_FOUND" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    sessionId: session.id,
    status: session.status,
    // mode/ageTier let the client reconstruct a legitimate /start request to transparently
    // reconnect if this session is later lost server-side - see the recovery flow in
    // app/simulations/[sessionId]/page.tsx.
    mode: session.mode,
    ageTier: session.ageTier,
    state: latestLog.returnedState as unknown as SimulationState,
  });
}
