import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface ContactRequestBody {
  name?: string;
  email?: string;
  organization?: string;
  message?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: ContactRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const { name, email, organization, message } = body;

  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "name and email are required." }, { status: 400 });
  }

  if (!EMAIL_PATTERN.test(email.trim())) {
    return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
  }

  const created = await prisma.contactLead.create({
    data: {
      name: name.trim(),
      email: email.trim(),
      organization: organization?.trim() || null,
      message: message?.trim() || null,
    },
  });

  return NextResponse.json({ id: created.id });
}
