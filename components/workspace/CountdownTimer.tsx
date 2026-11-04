"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CountdownTimerProps {
  /** Unique per crisis instance - changing it resets the ticker from durationSeconds, the same
   *  way SimulationShell's own per-step decision clock resets on `state.currentStep`. */
  anchorKey: string;
  label: string;
  durationSeconds: number;
  /** Fired exactly once, the tick the countdown crosses zero. Purely a visual/cognitive-load
   *  signal - callers decide whether to act on it; this component never submits or mutates
   *  simulation state on its own. */
  onExpire?: () => void;
  isDark?: boolean;
  className?: string;
}

function formatClock(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Visual time-pressure anchor for crisis-flagged simulation nodes (e.g. a live security breach or
 * a market liquidity crunch) - distinct from, and layered on top of, SimulationShell's own 60s
 * per-step decision clock. Ticks down from `durationSeconds`, escalating color as it approaches
 * zero, and calls `onExpire` once. Resets whenever `anchorKey` changes, so a new crisis node gets a
 * fresh countdown instead of inheriting whatever time was left on the last one.
 */
export default function CountdownTimer({ anchorKey, label, durationSeconds, onExpire, isDark, className }: CountdownTimerProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(durationSeconds);
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  // eslint-disable-next-line react-hooks/refs -- latest-callback ref, intentionally written every render
  onExpireRef.current = onExpire;

  useEffect(() => {
    expiredRef.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting the ticker for a new anchorKey/durationSeconds is the whole point of this effect
    setSecondsRemaining(durationSeconds);
    const startedAt = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = durationSeconds - elapsed;
      setSecondsRemaining(remaining);
      if (remaining <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpireRef.current?.();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [anchorKey, durationSeconds]);

  const fractionRemaining = Math.max(0, Math.min(1, secondsRemaining / durationSeconds));
  const urgency: "normal" | "warning" | "critical" =
    fractionRemaining <= 0.2 ? "critical" : fractionRemaining <= 0.5 ? "warning" : "normal";

  return (
    <div
      role="timer"
      aria-live="polite"
      className={cn(
        "flex items-center gap-3 border px-3 py-2 font-mono text-xs",
        urgency === "critical"
          ? "animate-pulse border-red-500/60 bg-red-500/10 text-red-400"
          : urgency === "warning"
            ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
            : isDark
              ? "border-slate-700 bg-slate-800 text-slate-300"
              : "border-slate-200 bg-slate-100 text-slate-600",
        className
      )}
    >
      {urgency === "critical" ? <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> : <Timer className="h-3.5 w-3.5 shrink-0" />}
      <span className="shrink-0 font-semibold uppercase tracking-wider">{label}</span>
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-black/20">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-1000 ease-linear",
            urgency === "critical" ? "bg-red-400" : urgency === "warning" ? "bg-amber-400" : "bg-signal"
          )}
          style={{ width: `${fractionRemaining * 100}%` }}
        />
      </div>
      <span className="shrink-0 tabular-nums font-bold">{formatClock(secondsRemaining)}</span>
    </div>
  );
}
