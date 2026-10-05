import { NextResponse } from "next/server";
import { getAuthenticatedStudent } from "@/lib/authStudent";

/** Lets client components (e.g. CohortKeyModal's trigger on the history page) check the
 *  signed-in student's current tier/email without duplicating the Supabase session lookup. */
export async function GET() {
  const student = await getAuthenticatedStudent();
  if (!student) {
    return NextResponse.json({ tier: "PUBLIC_DEMO", email: null });
  }
  return NextResponse.json({ tier: student.tier, email: student.email });
}
