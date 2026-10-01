import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedStudent } from "@/lib/authStudent";

interface SyncStudentBody {
  /** The guest's `sim_anon_session_id` from localStorage (see lib/anonymousSession.ts), if any -
   *  used to backfill their prior anonymous simulation history onto this real account. */
  anonymousSessionId?: string;
}

/** Reassigns every SimulationSession from the guest's anonymous Student row onto the real,
 *  newly-authenticated Student row, then deletes the now-empty anonymous row. Anonymous rows use
 *  a synthetic `anon_<uuid>@anonymous.simulation.local` email (see start/route.ts), structurally
 *  disjoint from real signup emails, so there's no unique-constraint collision to worry about.
 *  Safe to call with an anonymousSessionId that doesn't resolve to any row (no-op) or that
 *  already matches the real student (no-op, guards against re-running on an already-linked id). */
async function backfillAnonymousHistory(anonymousSessionId: string, realStudentId: string) {
  const anonStudent = await prisma.student.findUnique({
    where: { supabaseAuthId: `anon_${anonymousSessionId}` },
  });
  if (!anonStudent || anonStudent.id === realStudentId) return;

  await prisma.$transaction([
    prisma.simulationSession.updateMany({
      where: { studentId: anonStudent.id },
      data: { studentId: realStudentId },
    }),
    prisma.student.delete({ where: { id: anonStudent.id } }),
  ]);
}

/** Called right after a successful sign-up/sign-in so the Student row exists immediately, rather
 *  than waiting for the first simulation-start call to create it on demand. Also backfills any
 *  prior anonymous/guest simulation history onto the real account. */
export async function POST(request: Request) {
  const student = await getAuthenticatedStudent();
  if (!student) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: SyncStudentBody = {};
  try {
    body = await request.json();
  } catch {
    // No body (or invalid JSON) is fine - anonymousSessionId is optional.
  }

  if (body.anonymousSessionId) {
    await backfillAnonymousHistory(body.anonymousSessionId, student.id);
  }

  return NextResponse.json({ studentId: student.id, username: student.username });
}
