import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildSimulationRequestEmail, sendLeadAlertEmail } from "@/lib/resend";

interface SimulationRequestBody {
  careerTitle?: string;
}

export async function POST(request: Request) {
  let body: SimulationRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const { careerTitle } = body;
  if (!careerTitle?.trim()) {
    return NextResponse.json({ error: "careerTitle is required." }, { status: 400 });
  }

  const created = await prisma.simulationRequest.create({
    data: {
      // This form only ever collects a career title now - the rest of these columns predate
      // that simplification and stay filled with neutral defaults for schema compatibility.
      name: "Website Visitor",
      role: "STUDENT",
      organization: null,
      requestedCareerTitle: careerTitle.trim(),
      industry: "Not specified",
      keySkills: "Not specified",
    },
  });

  await sendLeadAlertEmail(buildSimulationRequestEmail(created));

  return NextResponse.json({ id: created.id });
}
