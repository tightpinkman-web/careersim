"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, LineChart as LineChartIcon, CandlestickChart } from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Cell,
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { cn } from "@/lib/utils";
import type { QuantPayload } from "@/types/simulation";

interface QuantSimulationViewProps {
  payload: QuantPayload;
  narrativePrompt: string;
}

export default function QuantSimulationView({ payload, narrativePrompt }: QuantSimulationViewProps) {
  const { ticker, candles, orderBook, news, parameters, pnl } = payload;
  const [chartMode, setChartMode] = useState<"candle" | "line">("candle");
  const [stopLoss, setStopLoss] = useState(parameters.stopLoss);
  const [volatilityThreshold, setVolatilityThreshold] = useState(parameters.volatilityThreshold);

  const chartData = useMemo(
    () =>
      candles.map((c) => ({
        time: c.time,
        close: c.close,
        wick: [c.low, c.high] as [number, number],
        body: [Math.min(c.open, c.close), Math.max(c.open, c.close)] as [number, number],
        isUp: c.close >= c.open,
      })),
    [candles]
  );

  const maxBookSize = Math.max(
    ...orderBook.bids.map((b) => b.size),
    ...orderBook.asks.map((a) => a.size),
    1
  );

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-3 overflow-hidden bg-slate-950 p-3 text-slate-200 xl:grid-cols-[2fr_1fr]">
      {/* Left: chart + parameters */}
      <div className="flex min-h-0 flex-col gap-3">
        <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-slate-800 bg-slate-900">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-800 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-100">{ticker}</h2>
            <span className={cn("flex items-center gap-1 text-xs font-medium", pnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
              {pnl >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {pnl >= 0 ? "+" : ""}
              {pnl.toFixed(2)} P&amp;L
            </span>
            <div className="ml-auto flex overflow-hidden rounded-md border border-slate-700 text-xs">
              <button
                onClick={() => setChartMode("candle")}
                className={cn(
                  "flex items-center gap-1 px-2 py-1",
                  chartMode === "candle" ? "bg-slate-700 text-white" : "text-slate-400 hover:bg-slate-800"
                )}
              >
                <CandlestickChart className="h-3.5 w-3.5" />
                Candles
              </button>
              <button
                onClick={() => setChartMode("line")}
                className={cn(
                  "flex items-center gap-1 px-2 py-1",
                  chartMode === "line" ? "bg-slate-700 text-white" : "text-slate-400 hover:bg-slate-800"
                )}
              >
                <LineChartIcon className="h-3.5 w-3.5" />
                Line
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 p-2">
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === "candle" ? (
                <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#64748b" }} stroke="#334155" />
                  <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "#64748b" }} stroke="#334155" />
                  <Tooltip
                    contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", fontSize: 11, borderRadius: 6 }}
                    labelStyle={{ color: "#94a3b8" }}
                  />
                  <Bar dataKey="wick" barSize={2} fill="#475569" isAnimationActive={false} />
                  <Bar dataKey="body" barSize={7} isAnimationActive={false}>
                    {chartData.map((d, i) => (
                      <Cell key={i} fill={d.isUp ? "#10b981" : "#ef4444"} />
                    ))}
                  </Bar>
                </ComposedChart>
              ) : (
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#64748b" }} stroke="#334155" />
                  <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "#64748b" }} stroke="#334155" />
                  <Tooltip
                    contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", fontSize: 11, borderRadius: 6 }}
                    labelStyle={{ color: "#94a3b8" }}
                  />
                  <Line type="monotone" dataKey="close" stroke="#818cf8" strokeWidth={2} dot={false} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Algorithmic parameters */}
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Algorithm Parameters</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-slate-400">Stop-Loss</span>
                <span className="font-mono text-slate-100">{stopLoss.toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={20}
                step={0.5}
                value={stopLoss}
                onChange={(e) => setStopLoss(parseFloat(e.target.value))}
                className="w-full accent-rose-500"
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-slate-400">Volatility Threshold</span>
                <span className="font-mono text-slate-100">{volatilityThreshold.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volatilityThreshold}
                onChange={(e) => setVolatilityThreshold(parseFloat(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right: order book + news */}
      <div className="flex min-h-0 flex-col gap-3">
        <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 px-4 py-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Order Book</h2>
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-2 divide-x divide-slate-800 overflow-y-auto">
            <div className="p-2">
              {orderBook.bids.map((level, i) => (
                <div key={i} className="relative mb-0.5 flex justify-between px-2 py-0.5 text-[11px] font-mono">
                  <div
                    className="absolute inset-y-0 right-0 bg-emerald-500/10"
                    style={{ width: `${(level.size / maxBookSize) * 100}%` }}
                  />
                  <span className="relative text-emerald-400">{level.price.toFixed(2)}</span>
                  <span className="relative text-slate-400">{level.size}</span>
                </div>
              ))}
            </div>
            <div className="p-2">
              {orderBook.asks.map((level, i) => (
                <div key={i} className="relative mb-0.5 flex justify-between px-2 py-0.5 text-[11px] font-mono">
                  <div
                    className="absolute inset-y-0 left-0 bg-rose-500/10"
                    style={{ width: `${(level.size / maxBookSize) * 100}%` }}
                  />
                  <span className="relative text-rose-400">{level.price.toFixed(2)}</span>
                  <span className="relative text-slate-400">{level.size}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex max-h-56 min-h-0 flex-col rounded-lg border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 px-4 py-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">News Ticker</h2>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {news.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[11px] leading-snug"
              >
                <span
                  className={cn(
                    "mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle",
                    item.sentiment === "positive" && "bg-emerald-400",
                    item.sentiment === "negative" && "bg-rose-400",
                    (!item.sentiment || item.sentiment === "neutral") && "bg-slate-500"
                  )}
                />
                <span className="text-slate-200">{item.headline}</span>
                <span className="ml-1 text-slate-500">&middot; {item.source}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <p className="rounded-lg border border-dashed border-slate-800 bg-slate-900/50 p-3 text-[11px] text-slate-400">
          {narrativePrompt}
        </p>
      </div>
    </div>
  );
}
