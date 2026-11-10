import { NextResponse } from "next/server";
import { requestVCPartnerTurn } from "@/lib/llm/vc-schemas";

interface VCPartnerTurnRequestBody {
  startupName?: string;
  coreThesis?: string;
  riskAudit?: string;
  valuationProposal?: string;
}

/**
 * Server-side endpoint for the Investment Memo Board's Defense Room (components/simulations/vc/
 * PartnerDefense.tsx) - requestVCPartnerTurn (lib/llm/vc-schemas.ts) calls Groq directly and must
 * stay server-side, the same reason every other LLM call in this app (start/action/evaluate routes)
 * is a route handler rather than something a client component invokes directly.
 */
export async function POST(request: Request) {
  let body: VCPartnerTurnRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON.", code: "INVALID_REQUEST" }, { status: 400 });
  }

  const { startupName, coreThesis, riskAudit, valuationProposal } = body;
  if (!coreThesis?.trim() || !riskAudit?.trim() || !valuationProposal?.trim()) {
    return NextResponse.json(
      { error: "coreThesis, riskAudit, and valuationProposal are all required.", code: "INVALID_REQUEST" },
      { status: 400 }
    );
  }

  const lastAction = [
    `Deal: ${startupName ?? "the target company"}`,
    `Core Thesis: ${coreThesis.trim()}`,
    `Risk Audit: ${riskAudit.trim()}`,
    `Valuation Proposal: ${valuationProposal.trim()}`,
  ].join("\n");

  const turn = await requestVCPartnerTurn([], lastAction);
  return NextResponse.json(turn);
}
