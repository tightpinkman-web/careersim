import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShieldCheck, Award } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { CAREER_TITLES } from "@/lib/careerTitles";
import type { CareerType } from "@/types/simulation";

async function loadVerifiedSession(hash: string) {
  const session = await prisma.simulationSession.findUnique({ where: { verificationHash: hash } });
  if (!session || session.status !== "COMPLETED" || session.overallScore === null || !session.competencies) {
    return null;
  }
  return session;
}

function topCompetency(competencies: Record<string, number>): string | null {
  const entries = Object.entries(competencies);
  if (entries.length === 0) return null;
  return entries.reduce((best, entry) => (entry[1] > best[1] ? entry : best))[0];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ hash: string }>;
}): Promise<Metadata> {
  const { hash } = await params;
  const session = await loadVerifiedSession(hash);
  const title = session
    ? `Verified Scorecard - ${CAREER_TITLES[session.careerType as CareerType]}`
    : "Scorecard Verification";
  return { title, description: "Verify the authenticity of an AI Career Simulator scorecard." };
}

export default async function VerifyScorecardPage({
  params,
}: {
  params: Promise<{ hash: string }>;
}) {
  const { hash } = await params;
  const session = await loadVerifiedSession(hash);
  if (!session) notFound();

  const competencies = session.competencies as Record<string, number>;
  const careerTitle = CAREER_TITLES[session.careerType as CareerType];
  const top = topCompetency(competencies);
  const completedDate = session.completedAt
    ? new Date(session.completedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-obsidian px-4 py-16 font-display">
      <div className="w-full max-w-md border border-hairline bg-surface p-8 text-center">
        <div className="flex items-center justify-center gap-2 font-mono text-xs font-semibold uppercase tracking-widest text-signal">
          <ShieldCheck className="h-4 w-4" />
          Verified Scorecard
        </div>

        <h1 className="mt-4 text-xl font-bold text-ink">{careerTitle}</h1>
        {completedDate && <p className="mt-1 text-xs text-slate-500">Completed {completedDate}</p>}

        <div className="mt-6 flex items-center justify-center gap-2">
          <span className="font-display text-4xl font-bold text-ink">{session.overallScore}</span>
          <span className="font-mono text-xs uppercase tracking-widest text-slate-500">/ 100</span>
        </div>

        {top && (
          <div className="mt-5 flex items-center justify-center gap-2 border border-hairline px-3 py-2 font-mono text-xs uppercase tracking-wide text-slate-300">
            <Award className="h-3.5 w-3.5 text-signal" />
            Top Competency: {top}
          </div>
        )}

        <p className="mt-6 text-xs leading-relaxed text-slate-500">
          This page confirms this scorecard was genuinely issued by AI Career Simulator for the session
          behind this unguessable link. No login is required to view it, and no personal student
          information is shown here.
        </p>
      </div>
    </div>
  );
}
