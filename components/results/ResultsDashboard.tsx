"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, TrendingUp, Compass, ArrowLeft, Printer } from "lucide-react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from "recharts";
import { cn } from "@/lib/utils";
import type { CareerType } from "@/types/simulation";

interface ResultsDashboardProps {
  careerType: CareerType;
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

  const color = score >= 80 ? "#10b981" : score >= 60 ? "#6366f1" : score >= 40 ? "#f59e0b" : "#ef4444";
  const offset = SCORE_CIRCUMFERENCE * (1 - animatedScore / 100);

  return (
    <div className="relative flex h-40 w-40 shrink-0 items-center justify-center">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={SCORE_RADIUS} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <motion.circle
          cx="60"
          cy="60"
          r={SCORE_RADIUS}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
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
          className="text-3xl font-bold text-slate-900"
        >
          {score}
        </motion.span>
        <span className="text-[10px] uppercase tracking-wide text-slate-400">/ 100</span>
      </div>
    </div>
  );
}

export default function ResultsDashboard({
  careerType,
  overallScore,
  competencies,
  keyStrengths,
  growthAreas,
  careerFitSummary,
}: ResultsDashboardProps) {
  const radarData = Object.entries(competencies).map(([dimension, value]) => ({ dimension, value }));

  return (
    <div className="min-h-screen bg-slate-100 pb-24">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
        <p className="text-center text-xs font-semibold uppercase tracking-wide text-indigo-600">
          {careerType.replace(/_/g, " ")} &middot; Career Aptitude Assessment
        </p>

        {/* Hero score card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:justify-center sm:gap-8"
        >
          <ScoreCircle score={overallScore} />
          <div className="text-center sm:text-left">
            <h1 className="text-xl font-bold text-slate-900">
              {overallScore >= 80
                ? "Exceptional Performance"
                : overallScore >= 60
                  ? "Strong Performance"
                  : overallScore >= 40
                    ? "Developing Performance"
                    : "Needs Significant Growth"}
            </h1>
            <p className="mt-1 max-w-md text-sm text-slate-500">
              Your overall score reflects your decisions across the entire simulation, weighed against
              what a strong performer in this career would have done.
            </p>
          </div>
        </motion.div>

        {/* Competency radar */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-700">Competency Breakdown</h2>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="75%">
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, fill: "#475569" }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: "#94a3b8" }} />
                <Radar
                  name="Score"
                  dataKey="value"
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.35}
                  isAnimationActive
                />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Strengths / growth areas */}
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm"
          >
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-800">
              <CheckCircle2 className="h-4 w-4" />
              Key Strengths Demonstrated
            </h2>
            <ul className="space-y-2.5">
              {keyStrengths.map((strength, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-emerald-900">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  {strength}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm"
          >
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-800">
              <TrendingUp className="h-4 w-4" />
              Areas for Development
            </h2>
            <ul className="space-y-2.5">
              {growthAreas.map((area, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-amber-900">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
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
          className="mt-6 rounded-2xl border border-indigo-200 bg-indigo-50 p-6 shadow-sm"
        >
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-indigo-800">
            <Compass className="h-4 w-4" />
            Career Reality Fit
          </h2>
          <p className="text-sm leading-relaxed text-indigo-950">{careerFitSummary}</p>
        </motion.div>
      </div>

      {/* Bottom action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-3 sm:justify-between">
          <Link
            href="/"
            className={cn(
              "flex items-center gap-2 rounded-md border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            Try Another Career
          </Link>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Printer className="h-4 w-4" />
            Export Career Assessment (PDF)
          </button>
        </div>
      </div>
    </div>
  );
}
