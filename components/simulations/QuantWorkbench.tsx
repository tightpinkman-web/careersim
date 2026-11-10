"use client";

import { useMemo, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from "recharts";
import { Gauge, Radio, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuantPayload } from "@/types/simulation";

interface QuantWorkbenchProps {
  payload: QuantPayload;
}

const SHOCKS = [
  { id: "rally", label: "+5% Rally", multiplier: 1.05 },
  { id: "pullback", label: "-5% Pullback", multiplier: 0.95 },
  { id: "flash-crash", label: "Flash Crash -15%", multiplier: 0.85 },
] as const;

const INVENTORY_LIMIT = 100;

function bestBid(orderBook: QuantPayload["orderBook"]): number {
  return orderBook.bids.reduce((best, level) => Math.max(best, level.price), 0);
}

/**
 * Market-making sandbox layered on top of QuantSimulationView's live order book/chart: a quoting
 * spread control around the current mid price, an inventory risk gauge driven by a local position
 * slider, and one-click volatility shocks that stress-test the recent candle path. Everything here
 * is a local what-if tool - it never mutates the engine's actual QuantPayload or submits an action,
 * it exists purely so the student can reason about spread/inventory/vol tradeoffs before deciding.
 */
export default function QuantWorkbench({ payload }: QuantWorkbenchProps) {
  const { candles, orderBook, pnl } = payload;
  const [spreadBps, setSpreadBps] = useState(10);
  const [position, setPosition] = useState(0);
  const [activeShockId, setActiveShockId] = useState<(typeof SHOCKS)[number]["id"] | null>(null);

  const bid = bestBid(orderBook);
  const ask = useMemo(() => {
    const asks = orderBook.asks.map((level) => level.price);
    return asks.length > 0 ? Math.min(...asks) : bid;
  }, [orderBook.asks, bid]);
  const mid = bid > 0 && ask > 0 ? (bid + ask) / 2 : (ask || bid);

  const quotedBid = mid * (1 - spreadBps / 2 / 10_000);
  const quotedAsk = mid * (1 + spreadBps / 2 / 10_000);

  const inventoryFraction = Math.min(1, Math.abs(position) / INVENTORY_LIMIT);
  const inventoryColor = inventoryFraction < 0.5 ? "bg-emerald-500" : inventoryFraction < 0.8 ? "bg-amber-500" : "bg-rose-500";

  const activeShock = SHOCKS.find((s) => s.id === activeShockId);
  const stressedPath = useMemo(() => {
    const multiplier = activeShock?.multiplier ?? 1;
    return candles.map((c, i) => ({
      time: c.time,
      base: c.close,
      stressed: i >= candles.length - 5 ? c.close * multiplier : c.close,
    }));
  }, [candles, activeShock]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-6 overflow-y-auto bg-obsidian p-6 text-slate-200">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <Radio className="h-3.5 w-3.5" />
        Market-Making Workbench
      </div>

      {/* Quoting spread */}
      <div className="rounded-lg border border-hairline bg-surface p-6">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="text-slate-400">Quoting Spread</span>
          <span className="font-mono text-slate-100">{spreadBps.toFixed(0)} bps</span>
        </div>
        <input
          type="range"
          min={1}
          max={100}
          step={1}
          value={spreadBps}
          onChange={(e) => setSpreadBps(parseFloat(e.target.value))}
          className="w-full accent-signal"
        />
        <div className="mt-3 grid grid-cols-2 gap-3 text-center font-mono text-sm">
          <div className="rounded-md bg-emerald-500/10 py-2 text-emerald-400">
            BID {quotedBid > 0 ? quotedBid.toFixed(2) : "--"}
          </div>
          <div className="rounded-md bg-rose-500/10 py-2 text-rose-400">
            ASK {quotedAsk > 0 ? quotedAsk.toFixed(2) : "--"}
          </div>
        </div>
      </div>

      {/* Inventory risk gauge */}
      <div className="rounded-lg border border-hairline bg-surface p-6">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-slate-400">
            <Gauge className="h-3.5 w-3.5" />
            Inventory Position
          </span>
          <span className="font-mono text-slate-100">
            {position > 0 ? "+" : ""}
            {position} units
          </span>
        </div>
        <input
          type="range"
          min={-INVENTORY_LIMIT}
          max={INVENTORY_LIMIT}
          step={5}
          value={position}
          onChange={(e) => setPosition(parseFloat(e.target.value))}
          className="w-full accent-slate-400"
        />
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-obsidian">
          <div
            className={cn("h-full rounded-full transition-all", inventoryColor)}
            style={{ width: `${inventoryFraction * 100}%` }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-slate-500">
          Risk level: {inventoryFraction < 0.5 ? "contained" : inventoryFraction < 0.8 ? "elevated" : "critical"} - unrealized
          P&amp;L {pnl >= 0 ? "+" : ""}
          {pnl.toFixed(2)}
        </p>
      </div>

      {/* Volatility shock injection */}
      <div className="rounded-lg border border-hairline bg-surface p-6">
        <div className="mb-2 flex items-center gap-1.5 text-xs text-slate-400">
          <Zap className="h-3.5 w-3.5" />
          Volatility Shock (what-if, local only)
        </div>
        <div className="flex flex-wrap gap-2">
          {SHOCKS.map((shock) => (
            <button
              key={shock.id}
              onClick={() => setActiveShockId((current) => (current === shock.id ? null : shock.id))}
              className={cn(
                "rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                activeShockId === shock.id
                  ? "border-signal bg-signal/15 text-signal"
                  : "border-slate-700 text-slate-300 hover:border-slate-500"
              )}
            >
              {shock.label}
            </button>
          ))}
        </div>
        <div className="mt-3 h-32 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stressedPath} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" tick={{ fontSize: 9, fill: "#64748b" }} stroke="#334155" />
              <YAxis domain={["auto", "auto"]} tick={{ fontSize: 9, fill: "#64748b" }} stroke="#334155" />
              <Tooltip
                contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", fontSize: 11, borderRadius: 6 }}
                labelStyle={{ color: "#94a3b8" }}
              />
              {mid > 0 && <ReferenceLine y={mid} stroke="#475569" strokeDasharray="4 4" />}
              <Line type="monotone" dataKey="base" stroke="#475569" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="stressed" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
