import { NextResponse } from "next/server";
import { getAuthenticatedStudent } from "@/lib/authStudent";

/** Called right after a successful sign-up/sign-in so the Student row exists immediately, rather
 *  than waiting for the first simulation-start call to create it on demand. */
export async function POST() {
  const student = await getAuthenticatedStudent();
  if (!student) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  return NextResponse.json({ studentId: student.id });
}
