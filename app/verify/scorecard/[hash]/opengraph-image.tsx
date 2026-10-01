import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { CAREER_TITLES } from "@/lib/careerTitles";
import type { CareerType } from "@/types/simulation";

export const alt = "Verified AI Career Simulator Scorecard";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function topCompetency(competencies: Record<string, number>): string | null {
  const entries = Object.entries(competencies);
  if (entries.length === 0) return null;
  return entries.reduce((best, entry) => (entry[1] > best[1] ? entry : best))[0];
}

export default async function Image({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  const session = await prisma.simulationSession.findUnique({ where: { verificationHash: hash } });

  const careerTitle =
    session && session.status === "COMPLETED" ? CAREER_TITLES[session.careerType as CareerType] : "AI Career Simulator";
  const score = session?.overallScore ?? null;
  const top = session?.competencies ? topCompetency(session.competencies as Record<string, number>) : null;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0b0d10",
          fontFamily: "sans-serif",
          padding: "60px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 26,
            fontWeight: 700,
            color: "#ffb800",
            letterSpacing: 2,
            textTransform: "uppercase",
            marginBottom: 24,
          }}
        >
          Verified Scorecard
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 52,
            fontWeight: 800,
            color: "#f8fafc",
            textAlign: "center",
            maxWidth: 940,
            lineHeight: 1.15,
          }}
        >
          {careerTitle}
        </div>
        {score !== null && (
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 36 }}>
            <span style={{ fontSize: 96, fontWeight: 800, color: "#ffb800" }}>{score}</span>
            <span style={{ fontSize: 28, color: "#64748b" }}>/ 100</span>
          </div>
        )}
        {top && (
          <div
            style={{
              display: "flex",
              fontSize: 26,
              color: "#cbd5e1",
              marginTop: 28,
              textAlign: "center",
            }}
          >
            Top Competency: {top}
          </div>
        )}
      </div>
    ),
    size
  );
}
