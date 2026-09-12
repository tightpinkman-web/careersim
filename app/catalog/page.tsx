"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, PlayCircle, ThumbsUp, GraduationCap, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATALOG, type CatalogIndustry, type CatalogStatus } from "@/lib/catalogData";

const INDUSTRY_PILLS: ("All" | CatalogIndustry)[] = ["All", "Tech", "Finance", "Legal", "Engineering", "Healthcare"];
const STATUS_PILLS: { id: "All" | CatalogStatus; label: string }[] = [
  { id: "All", label: "All" },
  { id: "live", label: "Live Demo" },
  { id: "in_development", label: "In Development" },
];

export default function CatalogPage() {
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState<"All" | CatalogIndustry>("All");
  const [status, setStatus] = useState<"All" | CatalogStatus>("All");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return CATALOG.filter((entry) => {
      if (industry !== "All" && entry.industry !== industry) return false;
      if (status !== "All" && entry.status !== status) return false;
      if (!query) return true;
      return (
        entry.title.toLowerCase().includes(query) ||
        entry.description.toLowerCase().includes(query) ||
        entry.keySkills.some((skill) => skill.toLowerCase().includes(query))
      );
    });
  }, [search, industry, status]);

  return (
    <div className="min-h-full w-full bg-slate-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Career Catalog</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">Every career on our roadmap</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
            Search live simulations and vote on which upcoming careers we build next.
          </p>
        </div>

        {/* Search */}
        <div className="relative mx-auto mt-8 max-w-lg">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, description, or skill..."
            className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-indigo-400"
          />
        </div>

        {/* Filter pills */}
        <div className="mt-6 flex flex-col items-center gap-3">
          <div className="flex flex-wrap justify-center gap-1.5">
            {INDUSTRY_PILLS.map((option) => (
              <button
                key={option}
                onClick={() => setIndustry(option)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  industry === option ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
                )}
              >
                {option}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {STATUS_PILLS.map((option) => (
              <button
                key={option.id}
                onClick={() => setStatus(option.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  status === option.id
                    ? "border-slate-800 bg-slate-800 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          {filtered.length} {filtered.length === 1 ? "career" : "careers"} found
        </p>

        {/* Card grid */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                    {entry.industry}
                  </span>
                  <h2 className="mt-2 text-sm font-semibold text-slate-900">{entry.title}</h2>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    entry.status === "live" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                  )}
                >
                  {entry.status === "live" ? "Live Demo" : "In Development"}
                </span>
              </div>

              <p className="text-xs leading-relaxed text-slate-500">{entry.description}</p>

              <div className="flex flex-wrap gap-1.5">
                {entry.keySkills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
                  >
                    {skill}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                {entry.modeSupport === "child_and_pro" ? (
                  <>
                    <GraduationCap className="h-3 w-3" />
                    Child + Professional modes
                  </>
                ) : (
                  <>
                    <Briefcase className="h-3 w-3" />
                    Professional mode only
                  </>
                )}
              </div>

              <div className="mt-auto pt-2">
                {entry.status === "live" ? (
                  <Link
                    href="/demo"
                    className="flex w-full items-center justify-center gap-1.5 rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                  >
                    <PlayCircle className="h-3.5 w-3.5" />
                    Launch Simulation
                  </Link>
                ) : (
                  <Link
                    href={`/request?career=${encodeURIComponent(entry.title)}`}
                    className="flex w-full items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                    Vote to Prioritize
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="mt-12 text-center text-sm text-slate-400">No careers match your search or filters.</p>
        )}
      </div>
    </div>
  );
}
