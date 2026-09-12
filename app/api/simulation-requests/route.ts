import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface SimulationRequestBody {
  name?: string;
  role?: string;
  organization?: string;
  requestedCareerTitle?: string;
  industry?: string;
  keySkills?: string;
}

export async function POST(request: Request) {
  let body: SimulationRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const { name, role, organization, requestedCareerTitle, industry, keySkills } = body;

  if (!name?.trim() || !requestedCareerTitle?.trim() || !industry?.trim() || !keySkills?.trim()) {
    return NextResponse.json(
      { error: "name, requestedCareerTitle, industry, and keySkills are required." },
      { status: 400 }
    );
  }

  if (role !== "COUNSELOR" && role !== "STUDENT") {
    return NextResponse.json({ error: "role must be either COUNSELOR or STUDENT." }, { status: 400 });
  }

  const created = await prisma.simulationRequest.create({
    data: {
      name: name.trim(),
      role,
      organization: organization?.trim() || null,
      requestedCareerTitle: requestedCareerTitle.trim(),
      industry: industry.trim(),
      keySkills: keySkills.trim(),
    },
  });

  return NextResponse.json({ id: created.id });
}
