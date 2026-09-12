import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedStudent } from "@/lib/authStudent";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const anonymousSessionId = searchParams.get("anonymousSessionId");

  // Signed-in users take priority (cookie-derived, never spoofable via query params); guests are
  // looked up by the anonymousSessionId their browser generated and persisted in localStorage.
  const authenticatedStudent = await getAuthenticatedStudent();
  const student =
    authenticatedStudent ??
    (anonymousSessionId
      ? await prisma.student.findUnique({ where: { supabaseAuthId: `anon_${anonymousSessionId}` } })
      : null);

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
