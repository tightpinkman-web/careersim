"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, GitCommitHorizontal } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import type { ProductPayload, KanbanCard, KanbanColumnId } from "@/types/simulation";

interface ProductSimulationViewProps {
  payload: ProductPayload;
  narrativePrompt: string;
}

const COLUMN_LABELS: Record<KanbanColumnId, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  SELECTED: "Selected",
};

const COLUMN_ORDER: KanbanColumnId[] = ["TODO", "IN_PROGRESS", "SELECTED"];

const priorityDot: Record<string, string> = {
  low: "bg-slate-400",
  medium: "bg-amber-500",
  high: "bg-rose-500",
};

export default function ProductSimulationView({ payload, narrativePrompt }: ProductSimulationViewProps) {
  const { board, funnelData, prioritizationMatrix, conversionRate } = payload;
  const [columns, setColumns] = useState(board.columns);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const moveCard = (cardId: string, to: KanbanColumnId) => {
    setColumns((prev) => {
      const next: Record<KanbanColumnId, KanbanCard[]> = {
        TODO: [...prev.TODO],
        IN_PROGRESS: [...prev.IN_PROGRESS],
        SELECTED: [...prev.SELECTED],
      };
      let moved: KanbanCard | undefined;
      for (const col of COLUMN_ORDER) {
        const idx = next[col].findIndex((c) => c.id === cardId);
        if (idx !== -1) {
          [moved] = next[col].splice(idx, 1);
          break;
        }
      }
      if (moved) next[to].unshift(moved);
      return next;
    });
  };

  return (
    <div className="grid h-full grid-cols-1 gap-4 overflow-hidden lg:grid-cols-2">
      {/* Left: Kanban */}
      <div className="flex min-h-0 flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
          <GitCommitHorizontal className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">Sprint Board</h2>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto p-3 sm:grid-cols-3">
          {COLUMN_ORDER.map((colId) => (
            <div
              key={colId}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => draggingId && moveCard(draggingId, colId)}
              className="flex min-h-[200px] flex-col rounded-md bg-slate-50 p-2"
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {COLUMN_LABELS[colId]}
                </h3>
                <span className="text-[10px] text-slate-400">{columns[colId].length}</span>
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <AnimatePresence>
                  {columns[colId].map((card) => (
                    <motion.div
                      key={card.id}
                      layout
                      layoutId={card.id}
                      draggable
                      onDragStart={() => setDraggingId(card.id)}
                      onDragEnd={() => setDraggingId(null)}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="cursor-grab rounded-md border border-slate-200 bg-white p-2 text-xs shadow-sm active:cursor-grabbing"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <p className="font-medium text-slate-800">{card.title}</p>
                        {card.priority && (
                          <span className={cn("mt-1 h-1.5 w-1.5 shrink-0 rounded-full", priorityDot[card.priority])} />
                        )}
                      </div>
                      {card.description && <p className="mt-1 text-[11px] text-slate-500">{card.description}</p>}
                      {typeof card.points === "number" && (
                        <span className="mt-2 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                          {card.points} pts
                        </span>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: analytics */}
      <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-700">Checkout Funnel</h2>
            <span className="ml-auto text-xs font-medium text-emerald-600">
              {conversionRate.toFixed(1)}% conversion
            </span>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={funnelData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="funnelGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="stage" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, backgroundColor: "#ffffff", color: "#0f172a", border: "1px solid #e2e8f0" }}
                  labelStyle={{ color: "#0f172a" }}
                  itemStyle={{ color: "#0f172a" }}
                />
                <Area type="monotone" dataKey="users" stroke="#6366f1" fill="url(#funnelGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex-1 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Impact vs. Effort</h2>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" dataKey="effort" name="Effort" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis type="number" dataKey="impact" name="Impact" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <ZAxis range={[80, 80]} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={({ payload: p }) =>
                    p && p[0] ? (
                      <div className="rounded-md border border-slate-200 bg-white p-2 text-xs text-slate-900 shadow">
                        <p className="font-medium text-slate-900">{p[0].payload.name}</p>
                        <p className="text-slate-700">Impact: {p[0].payload.impact}</p>
                        <p className="text-slate-700">Effort: {p[0].payload.effort}</p>
                      </div>
                    ) : null
                  }
                />
                <Scatter data={prioritizationMatrix} fill="#6366f1" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
          {narrativePrompt}
        </p>
      </div>
    </div>
  );
}
