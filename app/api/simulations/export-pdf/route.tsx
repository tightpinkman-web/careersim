import { NextResponse } from "next/server";
import { pdf } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { uploadScorecardPDF, getScorecardPDFUrl } from "@/lib/storage/pdf";
import AssessmentPdfReport from "@/components/AssessmentPdfReport";
import { CAREER_TITLES } from "@/lib/careerTitles";
import type { CareerType, SimulationMode } from "@/types/simulation";

interface ExportPdfRequestBody {
  sessionId?: string;
}

/** `pdf(element).toBuffer()` is misleadingly named - it resolves to a Node Readable stream, not an
 *  actual Buffer - so this drains it before handing anything to Supabase Storage's upload(), which
 *  needs the full byte length up front. */
async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/**
 * Renders and persists the PDF scorecard out-of-band from the results page's initial load -
 * previously every download re-rendered the PDF client-side on each click (see
 * components/DownloadReportButton.tsx). This route makes that a one-time, server-side cost: the
 * first call for a session renders the PDF, uploads it to Supabase Storage, and caches the public
 * URL on SimulationSession.pdfUrl; every call after that (any future download, a page revisit, a
 * concurrent tab) is a cache hit and returns instantly with no re-render.
 */
export async function POST(request: Request) {
  let body: ExportPdfRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON.", code: "INVALID_REQUEST" }, { status: 400 });
  }

  const { sessionId } = body;
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required.", code: "INVALID_REQUEST" }, { status: 400 });
  }

  const session = await prisma.simulationSession.findUnique({ where: { id: sessionId } });
  if (!session) {
    return NextResponse.json({ error: "No session found for the given sessionId.", code: "SESSION_NOT_FOUND" }, { status: 404 });
  }

  // Step A: cache check - the DB column first (0 extra round trips on the common case), then
  // Storage itself (covers a DB write that got interrupted after a successful upload).
  if (session.pdfUrl) {
    return NextResponse.json({ status: "ready", pdfUrl: session.pdfUrl });
  }
  const existingUrl = await getScorecardPDFUrl(sessionId);
  if (existingUrl) {
    await prisma.simulationSession.update({ where: { id: sessionId }, data: { pdfUrl: existingUrl } });
    return NextResponse.json({ status: "ready", pdfUrl: existingUrl });
  }

  const hasEvaluation =
    session.overallScore !== null &&
    session.competencies !== null &&
    session.keyStrengths.length > 0 &&
    session.growthAreas.length > 0 &&
    !!session.careerFitSummary;

  if (!hasEvaluation) {
    return NextResponse.json(
      { error: "This session hasn't been evaluated yet - nothing to export.", code: "NOT_EVALUATED" },
      { status: 409 }
    );
  }

  // Step B: render. Not queued onto a separate worker process (this app has no job queue
  // infrastructure) - "background" here means off the critical path of the results page's initial
  // load and every download click after the first, not off this request's own event loop.
  const careerType = session.careerType as CareerType;
  const element = (
    <AssessmentPdfReport
      sessionId={session.id}
      careerTitle={CAREER_TITLES[careerType]}
      mode={session.mode as SimulationMode}
      generatedDate={new Date()}
      overallScore={session.overallScore!}
      competencies={session.competencies as Record<string, number>}
      keyStrengths={session.keyStrengths}
      growthAreas={session.growthAreas}
      careerFitSummary={session.careerFitSummary!}
    />
  );

  let pdfBuffer: Buffer;
  try {
    const stream = await pdf(element).toBuffer();
    pdfBuffer = await streamToBuffer(stream);
  } catch (err) {
    console.error("[export-pdf] PDF render failed:", err);
    return NextResponse.json({ error: "Failed to render the PDF report.", code: "RENDER_ERROR" }, { status: 500 });
  }

  // Step C: persist - upload, then cache the URL on the session row.
  let pdfUrl: string;
  try {
    pdfUrl = await uploadScorecardPDF(sessionId, pdfBuffer);
  } catch (err) {
    console.error("[export-pdf] Supabase Storage upload failed:", err);
    return NextResponse.json({ error: "Failed to store the generated PDF.", code: "STORAGE_ERROR" }, { status: 502 });
  }

  await prisma.simulationSession.update({ where: { id: sessionId }, data: { pdfUrl } });

  return NextResponse.json({ status: "ready", pdfUrl });
}
