"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, TrendingUp, Compass, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import DownloadReportButton from "@/components/DownloadReportButton";
import { CAREER_TITLES } from "@/lib/careerTitles";
import type { CareerType, SimulationMode } from "@/types/simulation";

interface ResultsDashboardProps {
  sessionId: string;
  careerType: CareerType;
  mode: SimulationMode;
  overallScore: number;
  competencies: Record<string, number>;
  keyStrengths: string[];
  growthAreas: string[];
  careerFitSummary: string;
}

const SCORE_RADIUS = 54;
const SCORE_CIRCUMFERENCE = 2 * Math.PI * SCORE_RADIUS;

function ScoreCircle({ score }: { score: number }) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setAnimatedScore(score));
    return () => cancelAnimationFrame(frame);
  }, [score]);

  const offset = SCORE_CIRCUMFERENCE * (1 - animatedScore / 100);

  return (
    <div className="relative flex h-40 w-40 shrink-0 items-center justify-center">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={SCORE_RADIUS} fill="none" stroke="#1e293b" strokeWidth="10" />
        <motion.circle
          cx="60"
          cy="60"
          r={SCORE_RADIUS}
          fill="none"
          stroke="#ffb800"
          strokeWidth="10"
          strokeLinecap="square"
          strokeDasharray={SCORE_CIRCUMFERENCE}
          initial={{ strokeDashoffset: SCORE_CIRCUMFERENCE }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <motion.span
          key={score}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="font-display text-3xl font-bold text-ink"
        >
          {score}
        </motion.span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">/ 100</span>
      </div>
    </div>
  );
}

function CompetencyBar({ dimension, value, delay }: { dimension: string; value: number; delay: number }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-3 border-b border-hairline px-4 py-3 last:border-b-0 sm:grid-cols-[10rem_minmax(0,1fr)_3rem]">
      <span className="col-span-2 truncate font-mono text-[11px] uppercase tracking-wide text-slate-400 sm:col-span-1">
        {dimension}
      </span>
      <div className="h-2 w-full overflow-hidden bg-slate-800">
        <motion.div
          className="h-full bg-signal"
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.9, delay, ease: "easeOut" }}
        />
      </div>
      <span className="text-right font-mono text-xs font-semibold text-ink">{value}%</span>
    </div>
  );
}

export default function ResultsDashboard({
  sessionId,
  careerType,
  mode,
  overallScore,
  competencies,
  keyStrengths,
  growthAreas,
  careerFitSummary,
}: ResultsDashboardProps) {
  const competencyEntries = Object.entries(competencies);
  const careerTitle = CAREER_TITLES[careerType];

  return (
    <div className="min-h-screen bg-obsidian pb-24 font-display">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
        <p className="text-center font-mono text-xs font-semibold uppercase tracking-widest text-signal">
          [{careerTitle} :: EVALUATION_MATRIX]
        </p>

        {/* Hero score card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex flex-col items-center gap-4 border border-hairline bg-surface p-6 sm:flex-row sm:justify-center sm:gap-8"
        >
          <ScoreCircle score={overallScore} />
          <div className="text-center sm:text-left">
            <h1 className="text-xl font-bold text-ink">
              {overallScore >= 80
                ? "Exceptional Performance"
                : overallScore >= 60
                  ? "Strong Performance"
                  : overallScore >= 40
                    ? "Developing Performance"
                    : "Needs Significant Growth"}
            </h1>
            <p className="mt-1 max-w-md text-sm text-slate-400">
              Your overall score reflects your decisions across the entire simulation, weighed against
              what a strong performer in this career would have done.
            </p>
          </div>
        </motion.div>

        {/* Prominent PDF download - impossible to miss right after finishing */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-6 flex justify-center"
        >
          <DownloadReportButton
            variant="prominent"
            sessionId={sessionId}
            careerTitle={careerTitle}
            mode={mode}
            overallScore={overallScore}
            competencies={competencies}
            keyStrengths={keyStrengths}
            growthAreas={growthAreas}
            careerFitSummary={careerFitSummary}
          />
        </motion.div>

        {/* Competency matrix - animated horizontal bars, 0 -> target rating on entrance */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-6 border border-hairline bg-surface"
        >
          <div className="flex items-center gap-2 border-b border-hairline px-4 py-3">
            <TrendingUp className="h-4 w-4 text-slate-500" />
            <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-slate-300">
              [Competency Breakdown]
            </h2>
          </div>
          <div>
            {competencyEntries.map(([dimension, value], i) => (
              <CompetencyBar key={dimension} dimension={dimension} value={value} delay={0.15 + i * 0.08} />
            ))}
          </div>
        </motion.div>

        {/* Strengths / growth areas - dense matrix rows */}
        <div className="mt-6 grid grid-cols-1 gap-px border border-hairline bg-hairline sm:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-surface p-6"
          >
            <h2 className="mb-3 flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-widest text-signal">
              <CheckCircle2 className="h-4 w-4" />
              [Key Strengths]
            </h2>
            <ul className="space-y-2.5">
              {keyStrengths.map((strength, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-200">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-signal" />
                  {strength}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-surface p-6"
          >
            <h2 className="mb-3 flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-widest text-slate-400">
              <TrendingUp className="h-4 w-4" />
              [Areas for Development]
            </h2>
            <ul className="space-y-2.5">
              {growthAreas.map((area, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-200">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-slate-500" />
                  {area}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Career fit summary */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-6 border border-hairline bg-surface p-6"
        >
          <h2 className="mb-2 flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-widest text-slate-300">
            <Compass className="h-4 w-4" />
            [Career Reality Fit]
          </h2>
          <p className="text-sm leading-relaxed text-slate-300">{careerFitSummary}</p>
        </motion.div>
      </div>

      {/* Bottom action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-obsidian/95 px-4 py-3 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-3 sm:justify-between">
          <Link
            href="/"
            className={cn(
              "flex min-h-11 items-center gap-2 border border-hairline px-4 py-2.5 text-sm font-medium text-slate-300 hover:border-signal hover:text-signal"
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            Try Another Career
          </Link>
          <DownloadReportButton
            sessionId={sessionId}
            careerTitle={careerTitle}
            mode={mode}
            overallScore={overallScore}
            competencies={competencies}
            keyStrengths={keyStrengths}
            growthAreas={growthAreas}
            careerFitSummary={careerFitSummary}
          />
        </div>
      </div>
    </div>
  );
}
