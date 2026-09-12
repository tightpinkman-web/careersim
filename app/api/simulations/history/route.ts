import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const anonymousSessionId = searchParams.get("anonymousSessionId");

  if (!anonymousSessionId) {
    return NextResponse.json({ error: "anonymousSessionId query param is required." }, { status: 400 });
  }

  const student = await prisma.student.findUnique({
    where: { supabaseAuthId: `anon_${anonymousSessionId}` },
  });

  if (!student) {
    return NextResponse.json({ sessions: [] });
  }

  const sessions = await prisma.simulationSession.findMany({
    where: { studentId: student.id, status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
    select: {
      id: true,
      careerType: true,
      mode: true,
      overallScore: true,
      competencies: true,
      keyStrengths: true,
      growthAreas: true,
      careerFitSummary: true,
      completedAt: true,
      startedAt: true,
    },
  });

  return NextResponse.json({ sessions });
}
