import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRedisSession } from "@/lib/redis";
import type { SimulationState } from "@/types/simulation";

/** Used for a page reload/reconnect mid-session - since action/route.ts skips its synchronous
 *  per-turn Postgres write while Redis is available, the latest turn only exists in Postgres for
 *  a session that was never cached, was evicted, or whose last write happened with Redis down.
 *  Checking the cache first is what keeps the resume flow in app/simulations/[sessionId]/page.tsx
 *  working for an in-progress session instead of 404ing on its own latest turn. */
export async function GET(_request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;

  const cached = await getRedisSession(sessionId);
  if (cached && cached.turns.length > 0) {
    const latestTurn = cached.turns[cached.turns.length - 1];
    return NextResponse.json({
      sessionId,
      status: cached.status,
      mode: cached.mode,
      ageTier: cached.ageTier,
      state: latestTurn.returnedState as unknown as SimulationState,
    });
  }

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
