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
    return NextResponse.json({ error: "No session found for the given sessionId." }, { status: 404 });
  }

  const latestLog = session.actionLogs[0];
  if (!latestLog) {
    return NextResponse.json({ error: "Session has no recorded state yet." }, { status: 404 });
  }

  return NextResponse.json({
    sessionId: session.id,
    status: session.status,
    state: latestLog.returnedState as unknown as SimulationState,
  });
}
