"use client";

import { useMemo, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";
import { CalendarRange, Users2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductPayload } from "@/types/simulation";

interface PMWorkbenchProps {
  payload: ProductPayload;
}

const STAKEHOLDERS = ["Engineering", "Sales", "Support", "Executive"] as const;
type Stakeholder = (typeof STAKEHOLDERS)[number];

/**
 * PM sandbox layered on top of ProductSimulationView's Kanban/funnel/impact-effort views: a sprint
 * capacity allocation tool (how many of the already-selected backlog items fit this sprint) and a
 * stakeholder priority balancer that re-weights the existing impact/effort matrix per persona. Both
 * are local reasoning aids - committing a sprint or re-weighting priorities here doesn't move cards
 * on the real board or change what the Game Master sees; that stays owned by the main Kanban view.
 */
export default function PMWorkbench({ payload }: PMWorkbenchProps) {
  const { board, prioritizationMatrix, funnelData } = payload;
  const candidateCards = useMemo(() => [...board.columns.SELECTED, ...board.columns.TODO], [board.columns]);
  const totalCandidatePoints = candidateCards.reduce((sum, card) => sum + (card.points ?? 0), 0);

  const [capacity, setCapacity] = useState(Math.max(8, Math.round(totalCandidatePoints / 2) || 8));
  const [weights, setWeights] = useState<Record<Stakeholder, number>>({
    Engineering: 50,
    Sales: 50,
    Support: 50,
    Executive: 50,
  });

  // Greedy-fits cards (in their existing order) into capacity, mirroring how a PM would actually
  // sequence a sprint-planning pass rather than silently reordering the backlog.
  const { committed, overflow, committedPoints } = useMemo(() => {
    let remaining = capacity;
    const committedCards = [];
    const overflowCards = [];
    for (const card of candidateCards) {
      const points = card.points ?? 1;
      if (points <= remaining) {
        committedCards.push(card);
        remaining -= points;
      } else {
        overflowCards.push(card);
      }
    }
    return { committed: committedCards, overflow: overflowCards, committedPoints: capacity - remaining };
  }, [candidateCards, capacity]);

  const overCommitted = committedPoints > capacity;

  // The single aggregate weight across all four personas re-scores every backlog item's
  // impact/effort ratio, so a PM can see how priority ordering shifts as "whose voice counts more"
  // changes - a stand-in for the real negotiation a PM has across stakeholders.
  const averageWeight = STAKEHOLDERS.reduce((sum, s) => sum + weights[s], 0) / STAKEHOLDERS.length;
  const reweightedMatrix = useMemo(
    () =>
      prioritizationMatrix
        .map((item) => ({
          ...item,
          weightedScore: Math.round(((item.impact * (averageWeight / 50)) / Math.max(1, item.effort)) * 10),
        }))
        .sort((a, b) => b.weightedScore - a.weightedScore),
    [prioritizationMatrix, averageWeight]
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-6 overflow-y-auto bg-slate-50 p-6">
      {/* Sprint planning allocation */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="mb-3 flex items-center gap-2">
          <CalendarRange className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">Sprint Capacity Planning</h2>
          <span className={cn("ml-auto text-xs font-semibold", overCommitted ? "text-rose-600" : "text-emerald-600")}>
            {committedPoints}/{capacity} pts
          </span>
        </div>
        <input
          type="range"
          min={4}
          max={Math.max(20, totalCandidatePoints || 20)}
          step={1}
          value={capacity}
          onChange={(e) => setCapacity(parseFloat(e.target.value))}
          className="w-full accent-signal"
        />
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn("h-full rounded-full transition-all", overCommitted ? "bg-rose-500" : "bg-emerald-500")}
            style={{ width: `${Math.min(100, (committedPoints / capacity) * 100)}%` }}
          />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-600">Committed</p>
            <ul className="space-y-1">
              {committed.map((card) => (
                <li key={card.id} className="rounded bg-emerald-50 px-2 py-1 text-xs text-slate-700">
                  {card.title} <span className="text-slate-400">({card.points ?? 1} pts)</span>
                </li>
              ))}
              {committed.length === 0 && <li className="text-xs text-slate-400">Nothing fits yet - raise capacity.</li>}
            </ul>
          </div>
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Deferred</p>
            <ul className="space-y-1">
              {overflow.map((card) => (
                <li key={card.id} className="rounded bg-slate-50 px-2 py-1 text-xs text-slate-500">
                  {card.title} <span className="text-slate-400">({card.points ?? 1} pts)</span>
                </li>
              ))}
              {overflow.length === 0 && <li className="text-xs text-slate-400">Everything fits.</li>}
            </ul>
          </div>
        </div>
      </div>

      {/* Stakeholder priority balancing */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="mb-3 flex items-center gap-2">
          <Users2 className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">Stakeholder Priority Balance</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STAKEHOLDERS.map((stakeholder) => (
            <div key={stakeholder}>
              <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
                <span>{stakeholder}</span>
                <span className="font-mono text-slate-800">{weights[stakeholder]}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={weights[stakeholder]}
                onChange={(e) => setWeights((prev) => ({ ...prev, [stakeholder]: parseFloat(e.target.value) }))}
                className="w-full accent-signal"
              />
            </div>
          ))}
        </div>
        <div className="mt-3 h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={reweightedMatrix} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Bar dataKey="weightedScore" radius={[3, 3, 0, 0]}>
                {reweightedMatrix.map((item, i) => (
                  <Cell key={item.id} fill={i === 0 ? "#6366f1" : "#c7d2fe"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Feedback telemetry - derived from the existing conversion funnel's stage-over-stage drop */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">User Feedback Telemetry</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {funnelData.map((point, i) => {
            const previous = funnelData[i - 1];
            const dropPct = previous && previous.users > 0 ? Math.round(((previous.users - point.users) / previous.users) * 100) : 0;
            return (
              <div key={point.stage} className="rounded-md bg-slate-50 p-2.5 text-center">
                <p className="text-[11px] text-slate-500">{point.stage}</p>
                <p className="text-sm font-semibold text-slate-900">{point.users.toLocaleString()}</p>
                {i > 0 && (
                  <p className={cn("text-[10px]", dropPct > 20 ? "text-rose-500" : "text-slate-400")}>
                    -{dropPct}% drop-off
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
