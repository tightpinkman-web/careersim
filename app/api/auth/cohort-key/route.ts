import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedStudent } from "@/lib/authStudent";

interface CohortKeyBody {
  accessKey?: string;
}

/** Validates a school's cohort access key and links the signed-in student to that
 *  SchoolOrganization, upgrading them to ENTERPRISE_STUDENT. Used by CohortKeyModal for students
 *  signed in on a personal email domain (e.g. @gmail.com) that a partner domain whitelist can't
 *  reach. */
export async function POST(request: Request) {
  const student = await getAuthenticatedStudent();
  if (!student) {
    return NextResponse.json({ error: "You must be signed in to redeem an access key.", code: "UNAUTHENTICATED" }, { status: 401 });
  }

  let body: CohortKeyBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON.", code: "INVALID_REQUEST" }, { status: 400 });
  }

  const accessKey = body.accessKey?.trim();
  if (!accessKey) {
    return NextResponse.json({ error: "accessKey is required.", code: "INVALID_REQUEST" }, { status: 400 });
  }

  const organization = await prisma.schoolOrganization.findUnique({ where: { accessKey } });
  if (!organization) {
    return NextResponse.json({ error: "That access key wasn't recognized.", code: "INVALID_ACCESS_KEY" }, { status: 404 });
  }

  const enrolledCount = await prisma.student.count({ where: { schoolId: organization.id } });
  if (enrolledCount >= organization.maxStudents && student.schoolId !== organization.id) {
    return NextResponse.json(
      { error: "This cohort has reached its enrollment limit. Contact your Mindler representative.", code: "COHORT_FULL" },
      { status: 409 }
    );
  }

  const updated = await prisma.student.update({
    where: { id: student.id },
    data: { tier: "ENTERPRISE_STUDENT", schoolId: organization.id },
  });

  return NextResponse.json({ tier: updated.tier, organization: { name: organization.name } });
}
