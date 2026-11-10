"use client";

import { useMemo, useState } from "react";
import { AlertOctagon, FileSearch, GitPullRequestArrow } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LawPayload } from "@/types/simulation";

interface LegalWorkbenchProps {
  payload: LawPayload;
}

interface RiskCategory {
  id: string;
  label: string;
  pattern: RegExp;
  colorClass: string;
}

const RISK_CATEGORIES: RiskCategory[] = [
  { id: "liability", label: "Liability", pattern: /\b(liab(le|ility)|damages|limitation of liability)\b/gi, colorClass: "bg-rose-200/70 text-rose-900" },
  { id: "indemnification", label: "Indemnification", pattern: /\b(indemnif\w*|hold harmless)\b/gi, colorClass: "bg-amber-200/70 text-amber-900" },
  { id: "termination", label: "Termination", pattern: /\b(terminat\w*|for cause|without cause)\b/gi, colorClass: "bg-sky-200/70 text-sky-900" },
  { id: "confidentiality", label: "Confidentiality", pattern: /\b(confidential\w*|non-disclosure|nda)\b/gi, colorClass: "bg-violet-200/70 text-violet-900" },
];

interface CounterProposal {
  id: string;
  clauseHeading: string;
  proposedAmendment: string;
  rationale: string;
  status: "drafted" | "sent";
}

/** Splits `text` into plain-text and highlighted segments for every RISK_CATEGORIES match, so each
 *  flagged term can be rendered with its own category color without disturbing the surrounding
 *  prose. Matches from different categories are applied independently - a term matching two
 *  categories is highlighted with whichever category's pass reaches it first, which is an
 *  acceptable simplification for a reading aid, not a legal determination. */
function highlightRisks(text: string): { segments: { text: string; category: RiskCategory | null }[] } {
  const matches: { start: number; end: number; category: RiskCategory }[] = [];
  for (const category of RISK_CATEGORIES) {
    const pattern = new RegExp(category.pattern.source, category.pattern.flags);
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      matches.push({ start: match.index, end: match.index + match[0].length, category });
      if (match[0].length === 0) pattern.lastIndex += 1;
    }
  }
  matches.sort((a, b) => a.start - b.start);

  const segments: { text: string; category: RiskCategory | null }[] = [];
  let cursor = 0;
  for (const match of matches) {
    if (match.start < cursor) continue; // overlapping match from a different category - skip
    if (match.start > cursor) segments.push({ text: text.slice(cursor, match.start), category: null });
    segments.push({ text: text.slice(match.start, match.end), category: match.category });
    cursor = match.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), category: null });
  return { segments };
}

/**
 * Legal Workbench: a document-wide liability/indemnification/termination/confidentiality scanner
 * (distinct from LawSimulationView's own per-clause `flagged`/`redline` fields - this re-scans the
 * raw clause text for risk-bearing language wherever it appears) plus a structured counter-proposal
 * builder, rendered separately from the freeform negotiation chat so a counter-offer reads as a
 * deliberate redline rather than a chat message. Submitting here stays local/sandboxed - it never
 * posts into the real negotiationThread the Game Master sees.
 */
export default function LegalWorkbench({ payload }: LegalWorkbenchProps) {
  const { clauses } = payload;
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedClauseId, setSelectedClauseId] = useState<string | null>(clauses[0]?.id ?? null);
  const [amendment, setAmendment] = useState("");
  const [rationale, setRationale] = useState("");
  const [proposals, setProposals] = useState<CounterProposal[]>([]);

  const riskCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const category of RISK_CATEGORIES) counts[category.id] = 0;
    for (const clause of clauses) {
      for (const category of RISK_CATEGORIES) {
        const pattern = new RegExp(category.pattern.source, category.pattern.flags);
        const found = clause.text.match(pattern);
        if (found) counts[category.id] += found.length;
      }
    }
    return counts;
  }, [clauses]);

  const selectedClause = clauses.find((c) => c.id === selectedClauseId) ?? null;

  function submitProposal(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClause || !amendment.trim()) return;
    setProposals((prev) => [
      ...prev,
      {
        id: `proposal-${Date.now()}`,
        clauseHeading: selectedClause.heading,
        proposedAmendment: amendment.trim(),
        rationale: rationale.trim(),
        status: "drafted",
      },
    ]);
    setAmendment("");
    setRationale("");
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-6 overflow-y-auto bg-slate-50 p-6">
      {/* Risk scanner */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="mb-3 flex items-center gap-2">
          <FileSearch className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">Liability &amp; Risk Scanner</h2>
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory(null)}
            className={cn("rounded-full px-2.5 py-1 text-xs font-medium", activeCategory === null ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600")}
          >
            All ({Object.values(riskCounts).reduce((a, b) => a + b, 0)})
          </button>
          {RISK_CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory((current) => (current === category.id ? null : category.id))}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium",
                activeCategory === category.id ? category.colorClass : "bg-slate-100 text-slate-600"
              )}
            >
              {category.label} ({riskCounts[category.id]})
            </button>
          ))}
        </div>
        <div className="max-h-72 space-y-3 overflow-y-auto font-serif">
          {clauses.map((clause) => {
            const { segments } = highlightRisks(clause.text);
            return (
              <div key={clause.id} className="border-b border-slate-100 pb-2">
                <h3 className="mb-1 text-xs font-semibold text-slate-800">{clause.heading}</h3>
                <p className="text-sm leading-relaxed text-slate-700">
                  {segments.map((segment, i) => {
                    const dimmed = activeCategory && segment.category?.id !== activeCategory;
                    return (
                      <span
                        key={i}
                        className={cn(
                          segment.category && !dimmed && cn("rounded px-0.5", segment.category.colorClass),
                          dimmed && "opacity-40"
                        )}
                      >
                        {segment.text}
                      </span>
                    );
                  })}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Counter-proposal builder */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="mb-3 flex items-center gap-2">
          <GitPullRequestArrow className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">Counter-Proposal Builder</h2>
        </div>
        <form onSubmit={submitProposal} className="space-y-2">
          <select
            value={selectedClauseId ?? ""}
            onChange={(e) => setSelectedClauseId(e.target.value)}
            className="w-full rounded-md border border-slate-200 px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-signal"
          >
            {clauses.map((clause) => (
              <option key={clause.id} value={clause.id}>
                {clause.heading}
              </option>
            ))}
          </select>
          <textarea
            value={amendment}
            onChange={(e) => setAmendment(e.target.value)}
            placeholder="Proposed amended language..."
            className="min-h-[60px] w-full resize-none rounded-md border border-slate-200 p-2.5 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-signal"
          />
          <input
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            placeholder="Rationale (optional)"
            className="w-full rounded-md border border-slate-200 px-2.5 py-2 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-signal"
          />
          <button
            type="submit"
            disabled={!amendment.trim()}
            className="rounded-md bg-signal px-3 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-40"
          >
            Draft Counter-Proposal
          </button>
        </form>

        {proposals.length > 0 && (
          <ul className="mt-3 space-y-2">
            {proposals.map((proposal) => (
              <li key={proposal.id} className="flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 p-2.5 text-xs">
                <AlertOctagon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                <div>
                  <p className="font-semibold text-slate-800">{proposal.clauseHeading}</p>
                  <p className="mt-0.5 text-slate-600">{proposal.proposedAmendment}</p>
                  {proposal.rationale && <p className="mt-0.5 text-slate-400">{proposal.rationale}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
