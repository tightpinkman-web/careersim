"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, PlayCircle, ThumbsUp, Check, GraduationCap, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATALOG, type CatalogIndustry, type CatalogStatus, type CatalogVoteMap } from "@/lib/catalogData";
import { getVotedCatalogIds, markCatalogIdVoted } from "@/lib/votedCatalogEntries";

const INDUSTRY_PILLS: ("All" | CatalogIndustry)[] = ["All", "Tech", "Finance", "Legal", "Engineering", "Healthcare"];
const STATUS_PILLS: { id: "All" | CatalogStatus; label: string }[] = [
  { id: "All", label: "All" },
  { id: "live", label: "Live Demo" },
  { id: "in_development", label: "In Development" },
];

export default function CatalogPageClient() {
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState<"All" | CatalogIndustry>("All");
  const [status, setStatus] = useState<"All" | CatalogStatus>("All");
  const [votes, setVotes] = useState<CatalogVoteMap>({});
  // Lazy initializer (not an effect) - reading localStorage here is a synchronous, one-time
  // read of already-existing browser state, not a subscription to an external system.
  const [votedIds, setVotedIds] = useState<Set<string>>(() => getVotedCatalogIds());
  const [votingId, setVotingId] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await fetch("/api/catalog/vote");
        const data = await res.json();
        if (!ignore && res.ok) setVotes(data.votes ?? {});
      } catch {
        // Vote counts are a nice-to-have on this page - fail silently and show 0s.
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  const handleVote = async (catalogId: string) => {
    if (votingId || votedIds.has(catalogId)) return;
    setVotingId(catalogId);
    // Optimistic update - reconciled with the server's real count on success, rolled back on failure.
    setVotes((prev) => ({ ...prev, [catalogId]: (prev[catalogId] ?? 0) + 1 }));
    try {
      const res = await fetch("/api/catalog/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catalogId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to vote.");
      setVotes((prev) => ({ ...prev, [catalogId]: data.voteCount }));
      markCatalogIdVoted(catalogId);
      setVotedIds((prev) => new Set(prev).add(catalogId));
    } catch {
      setVotes((prev) => ({ ...prev, [catalogId]: Math.max(0, (prev[catalogId] ?? 1) - 1) }));
    } finally {
      setVotingId(null);
    }
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matches = CATALOG.filter((entry) => {
      if (industry !== "All" && entry.industry !== industry) return false;
      if (status !== "All" && entry.status !== status) return false;
      if (!query) return true;
      return (
        entry.title.toLowerCase().includes(query) ||
        entry.description.toLowerCase().includes(query) ||
        entry.keySkills.some((skill) => skill.toLowerCase().includes(query))
      );
    });

    // Only reorders within the "in development" group (highest votes first) - live demos and
    // the relative position of everything else are left exactly as authored.
    return [...matches].sort((a, b) => {
      if (a.status === "in_development" && b.status === "in_development") {
        return (votes[b.id] ?? 0) - (votes[a.id] ?? 0);
      }
      return 0;
    });
  }, [search, industry, status, votes]);

  return (
    <div className="min-h-full w-full bg-obsidian font-display">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="text-center">
          <p className="font-mono text-xs font-semibold uppercase tracking-widest text-signal">
            [CAREER_CATALOG]
          </p>
          <h1 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">Every career on our roadmap</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">
            Search live simulations and vote on which upcoming careers we build next.
          </p>
        </div>

        {/* Search */}
        <div className="relative mx-auto mt-8 max-w-lg">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, description, or skill..."
            className="w-full border border-hairline bg-surface py-2.5 pl-10 pr-4 text-sm text-ink outline-none placeholder:text-slate-500 focus:border-signal"
          />
        </div>

        {/* Industry filter - inline monospaced horizontal scroller */}
        <div className="mt-6 flex gap-1.5 overflow-x-auto whitespace-nowrap px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {INDUSTRY_PILLS.map((option) => (
            <button
              key={option}
              onClick={() => setIndustry(option)}
              className={cn(
                "shrink-0 border px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-wide transition-colors",
                industry === option
                  ? "border-signal text-signal"
                  : "border-hairline text-slate-400 hover:border-slate-600 hover:text-ink"
              )}
            >
              {option}
            </button>
          ))}
        </div>

        {/* Status filter - inline monospaced horizontal scroller */}
        <div className="mt-2 mb-8 flex gap-1.5 overflow-x-auto whitespace-nowrap px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {STATUS_PILLS.map((option) => (
            <button
              key={option.id}
              onClick={() => setStatus(option.id)}
              className={cn(
                "shrink-0 border px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-wide transition-colors",
                status === option.id
                  ? "border-signal bg-signal text-obsidian"
                  : "border-hairline text-slate-400 hover:border-slate-600 hover:text-ink"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <p className="text-center font-mono text-[11px] uppercase tracking-wide text-slate-500">
          [{filtered.length} {filtered.length === 1 ? "career" : "careers"} found]
        </p>

        {/* Bento grid */}
        <div className="mt-6 grid grid-cols-1 gap-px border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((entry) => (
            <div key={entry.id} className="group flex h-full flex-col gap-3 bg-surface p-5 transition-colors hover:bg-surface/60">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="border border-hairline px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    {entry.industry}
                  </span>
                  <h2 className="mt-2 text-sm font-semibold text-ink">{entry.title}</h2>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span
                    className={cn(
                      "flex items-center gap-1 border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide",
                      entry.status === "live"
                        ? "border-signal text-signal"
                        : "border-hairline text-slate-500"
                    )}
                  >
                    <span
                      className={cn("h-1.5 w-1.5 shrink-0", entry.status === "live" ? "bg-signal" : "bg-slate-500")}
                    />
                    {entry.status === "live" ? "LIVE" : "IN_DEV"}
                  </span>
                  {entry.status === "in_development" && (
                    <span className="flex items-center gap-1 border border-hairline px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-400">
                      <ThumbsUp className="h-2.5 w-2.5" />
                      {votes[entry.id] ?? 0} {(votes[entry.id] ?? 0) === 1 ? "vote" : "votes"}
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs leading-relaxed text-slate-400">{entry.description}</p>

              <div className="flex flex-wrap gap-1.5">
                {entry.keySkills.map((skill) => (
                  <span
                    key={skill}
                    className="border border-hairline px-2 py-0.5 font-mono text-[10px] font-medium text-slate-500"
                  >
                    {skill}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wide text-slate-500">
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
                    className="flex min-h-11 w-full items-center justify-center gap-1.5 border border-signal bg-signal px-3 py-2 text-xs font-semibold uppercase tracking-wide text-obsidian transition-opacity hover:opacity-90"
                  >
                    <PlayCircle className="h-3.5 w-3.5" />
                    Launch Simulation
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleVote(entry.id)}
                    disabled={votedIds.has(entry.id) || votingId === entry.id}
                    className={cn(
                      "flex min-h-11 w-full items-center justify-center gap-1.5 border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors disabled:cursor-not-allowed",
                      votedIds.has(entry.id)
                        ? "border-hairline text-slate-600"
                        : "border-hairline text-slate-300 hover:border-signal hover:text-signal"
                    )}
                  >
                    {votedIds.has(entry.id) ? <Check className="h-3.5 w-3.5" /> : <ThumbsUp className="h-3.5 w-3.5" />}
                    {votedIds.has(entry.id) ? "Voted - Thanks!" : "Vote to Prioritize"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="mt-12 text-center text-sm text-slate-500">No careers match your search or filters.</p>
        )}
      </div>
    </div>
  );
}
