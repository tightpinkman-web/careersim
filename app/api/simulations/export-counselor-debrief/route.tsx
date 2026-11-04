import { NextResponse } from "next/server";
import { pdf } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { uploadCounselorDebriefPDF, getCounselorDebriefPDFUrl } from "@/lib/storage/pdf";
import CounselorDebriefReport from "@/components/results/CounselorDebriefReport";
import { CAREER_TITLES } from "@/lib/careerTitles";
import type { CareerType, SimulationMode } from "@/types/simulation";
import type { TelemetrySnapshot } from "@/lib/telemetry/tracker";

interface ExportDebriefRequestBody {
  sessionId?: string;
}

/** Same stream-draining fix as app/api/simulations/export-pdf/route.tsx - `pdf(element).toBuffer()`
 *  resolves to a Node Readable stream, not an actual Buffer. */
async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/**
 * Counselor-only companion to export-pdf/route.ts: renders and persists
 * components/results/CounselorDebriefReport.tsx (Cognitive Profile Mapping + Guided Discussion
 * Prompts built from this session's telemetry) to its own cache key
 * (SimulationSession.counselorDebriefUrl / `${sessionId}-debrief.pdf` in Storage) so it never
 * collides with, or gets served in place of, the student-facing scorecard.
 */
export async function POST(request: Request) {
  let body: ExportDebriefRequestBody;
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

  if (session.counselorDebriefUrl) {
    return NextResponse.json({ status: "ready", pdfUrl: session.counselorDebriefUrl });
  }
  const existingUrl = await getCounselorDebriefPDFUrl(sessionId);
  if (existingUrl) {
    await prisma.simulationSession.update({ where: { id: sessionId }, data: { counselorDebriefUrl: existingUrl } });
    return NextResponse.json({ status: "ready", pdfUrl: existingUrl });
  }

  const hasEvaluation =
    session.overallScore !== null && session.competencies !== null && session.keyStrengths.length > 0 && session.growthAreas.length > 0;

  if (!hasEvaluation) {
    return NextResponse.json(
      { error: "This session hasn't been evaluated yet - nothing to export.", code: "NOT_EVALUATED" },
      { status: 409 }
    );
  }

  const careerType = session.careerType as CareerType;
  const element = (
    <CounselorDebriefReport
      sessionId={session.id}
      careerTitle={CAREER_TITLES[careerType]}
      mode={session.mode as SimulationMode}
      generatedDate={new Date()}
      overallScore={session.overallScore!}
      competencies={session.competencies as Record<string, number>}
      keyStrengths={session.keyStrengths}
      growthAreas={session.growthAreas}
      telemetry={(session.telemetry as TelemetrySnapshot | null) ?? null}
    />
  );

  let pdfBuffer: Buffer;
  try {
    const stream = await pdf(element).toBuffer();
    pdfBuffer = await streamToBuffer(stream);
  } catch (err) {
    console.error("[export-counselor-debrief] PDF render failed:", err);
    return NextResponse.json({ error: "Failed to render the counselor debrief PDF.", code: "RENDER_ERROR" }, { status: 500 });
  }

  let pdfUrl: string;
  try {
    pdfUrl = await uploadCounselorDebriefPDF(sessionId, pdfBuffer);
  } catch (err) {
    console.error("[export-counselor-debrief] Supabase Storage upload failed:", err);
    return NextResponse.json({ error: "Failed to store the generated PDF.", code: "STORAGE_ERROR" }, { status: 502 });
  }

  await prisma.simulationSession.update({ where: { id: sessionId }, data: { counselorDebriefUrl: pdfUrl } });

  return NextResponse.json({ status: "ready", pdfUrl });
}
