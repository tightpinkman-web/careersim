"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, AlertTriangle, GraduationCap, Briefcase, Calendar, History, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAnonymousSessionId } from "@/lib/anonymousSession";
import { CAREER_TITLES } from "@/lib/careerTitles";
import DownloadReportButton from "@/components/DownloadReportButton";
import type { CareerType, SimulationMode } from "@/types/simulation";

interface HistorySession {
  id: string;
  careerType: CareerType;
  mode: SimulationMode;
  overallScore: number | null;
  competencies: Record<string, number> | null;
  keyStrengths: string[];
  growthAreas: string[];
  careerFitSummary: string | null;
  completedAt: string | null;
  startedAt: string;
}

type SortOption = "recent" | "highest" | "lowest";
type CareerFilter = "All" | CareerType;
type ModeFilter = "All" | SimulationMode;

const CAREER_FILTER_OPTIONS: CareerFilter[] = [
  "All",
  "VENTURE_CAPITAL",
  "CYBERSECURITY",
  "PRODUCT_MANAGEMENT",
  "CORPORATE_LAW",
  "QUANT_TRADING",
];

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function scoreBadgeClasses(score: number | null): string {
  if (score === null) return "bg-slate-100 text-slate-500";
  if (score >= 80) return "bg-emerald-50 text-emerald-700";
  if (score >= 60) return "bg-indigo-50 text-indigo-700";
  if (score >= 40) return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<HistorySession[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [careerFilter, setCareerFilter] = useState<CareerFilter>("All");
  const [modeFilter, setModeFilter] = useState<ModeFilter>("All");

  useEffect(() => {
    let ignore = false;

    (async () => {
      try {
        const anonymousSessionId = getAnonymousSessionId();
        const res = await fetch(`/api/simulations/history?anonymousSessionId=${encodeURIComponent(anonymousSessionId)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load your simulation history.");
        if (ignore) return;
        setSessions(data.sessions);
      } catch (err) {
        if (ignore) return;
        setError(err instanceof Error ? err.message : "Failed to load your simulation history.");
      }
    })();

    return () => {
      ignore = true;
    };
  }, []);

  const visibleSessions = useMemo(() => {
    if (!sessions) return [];
    let list = sessions;
    if (careerFilter !== "All") list = list.filter((s) => s.careerType === careerFilter);
    if (modeFilter !== "All") list = list.filter((s) => s.mode === modeFilter);

    const sorted = [...list];
    if (sortBy === "highest") sorted.sort((a, b) => (b.overallScore ?? -1) - (a.overallScore ?? -1));
    else if (sortBy === "lowest") sorted.sort((a, b) => (a.overallScore ?? 101) - (b.overallScore ?? 101));
    else
      sorted.sort(
        (a, b) => new Date(b.completedAt ?? b.startedAt).getTime() - new Date(a.completedAt ?? a.startedAt).getTime()
      );
    return sorted;
  }, [sessions, sortBy, careerFilter, modeFilter]);

  return (
    <div className="min-h-full w-full bg-slate-50">
      <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <History className="h-6 w-6" />
          </span>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-indigo-600">My Results &amp; Reports</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">Completed Simulations</h1>
          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">
            Every simulation you&apos;ve finished on this device, with your score, competency breakdown, and a
            downloadable report for each.
          </p>
        </div>

        {/* Filter + sort controls */}
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500">Sort by</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-400"
            >
              <option value="recent">Most Recent</option>
              <option value="highest">Highest Score</option>
              <option value="lowest">Lowest Score</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500">Career</label>
            <select
              value={careerFilter}
              onChange={(e) => setCareerFilter(e.target.value as CareerFilter)}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-400"
            >
              {CAREER_FILTER_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === "All" ? "All Careers" : CAREER_TITLES[option]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500">Mode</label>
            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value as ModeFilter)}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-400"
            >
              <option value="All">All Modes</option>
              <option value="child">Child / Aptitude Focus</option>
              <option value="professional">Professional</option>
            </select>
          </div>
        </div>

        {error && (
          <p className="mt-8 flex items-center justify-center gap-1.5 text-sm text-rose-600">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        {!sessions && !error && (
          <div className="mt-16 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        )}

        {sessions && sessions.length === 0 && (
          <div className="mt-16 flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-slate-500">
              You haven&apos;t completed a simulation on this device yet.
            </p>
            <Link
              href="/demo"
              className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <PlayCircle className="h-4 w-4" />
              Try a Demo Simulation
            </Link>
          </div>
        )}

        {sessions && sessions.length > 0 && visibleSessions.length === 0 && (
          <p className="mt-16 text-center text-sm text-slate-400">No completed simulations match these filters.</p>
        )}

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleSessions.map((session) => {
            const isChild = session.mode === "child";
            return (
              <div
                key={session.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-sm font-semibold text-slate-900">{CAREER_TITLES[session.careerType]}</h2>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-xs font-bold",
                      scoreBadgeClasses(session.overallScore)
                    )}
                  >
                    {session.overallScore ?? "—"}/100
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(session.completedAt)}
                  </span>
                  <span
                    className={cn(
                      "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      isChild ? "bg-emerald-50 text-emerald-700" : "bg-slate-800 text-white"
                    )}
                  >
                    {isChild ? <GraduationCap className="h-3 w-3" /> : <Briefcase className="h-3 w-3" />}
                    {isChild ? "Child / Aptitude Focus" : "Professional"}
                  </span>
                </div>

                <div className="mt-auto pt-2">
                  <DownloadReportButton
                    sessionId={session.id}
                    careerTitle={CAREER_TITLES[session.careerType]}
                    mode={session.mode}
                    overallScore={session.overallScore ?? 0}
                    competencies={session.competencies ?? {}}
                    keyStrengths={session.keyStrengths}
                    growthAreas={session.growthAreas}
                    careerFitSummary={session.careerFitSummary ?? ""}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
