import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CATALOG } from "@/lib/catalogData";

interface VoteRequestBody {
  catalogId?: string;
}

/** Current vote tally for every catalog entry that has at least one vote. Entries with none
 *  simply don't have a row - callers default missing ids to 0. */
export async function GET() {
  const votes = await prisma.catalogVote.findMany();
  const tally: Record<string, number> = {};
  for (const vote of votes) tally[vote.catalogId] = vote.voteCount;
  return NextResponse.json({ votes: tally });
}

/** Increments the vote count for one "in development" catalog entry by 1. */
export async function POST(request: Request) {
  let body: VoteRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const { catalogId } = body;
  if (!catalogId?.trim()) {
    return NextResponse.json({ error: "catalogId is required." }, { status: 400 });
  }

  const entry = CATALOG.find((c) => c.id === catalogId);
  if (!entry) {
    return NextResponse.json({ error: "Unknown catalogId." }, { status: 404 });
  }
  if (entry.status !== "in_development") {
    return NextResponse.json({ error: "Only in-development careers can be voted on." }, { status: 409 });
  }

  const updated = await prisma.catalogVote.upsert({
    where: { catalogId },
    update: { voteCount: { increment: 1 } },
    create: { catalogId, voteCount: 1 },
  });

  return NextResponse.json({ catalogId, voteCount: updated.voteCount });
}
