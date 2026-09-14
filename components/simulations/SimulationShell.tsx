"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useHotkeys } from "react-hotkeys-hook";
import { Send, Clock, Gauge, DollarSign, Percent, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SimulationState } from "@/types/simulation";
import VCSimulationView from "@/components/simulations/VCSimulationView";
import CyberSimulationView from "@/components/simulations/CyberSimulationView";
import ProductSimulationView from "@/components/simulations/ProductSimulationView";
import LawSimulationView from "@/components/simulations/LawSimulationView";
import QuantSimulationView from "@/components/simulations/QuantSimulationView";

interface SimulationShellProps {
  state: SimulationState;
  /** elapsedSeconds is how long the student took to respond to the current step, measured from
   *  when this state was rendered to when they submitted - captured regardless of whether the
   *  60s countdown had run out. */
  onAction?: (actionId: string, freeformInput?: string, elapsedSeconds?: number) => void;
}

const HUD_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  fundsLeft: DollarSign,
  serverHealth: Gauge,
  conversionRate: Percent,
  timeRemaining: Clock,
};

const DECISION_WINDOW_SECONDS = 60;

// Tactile spring used for every interactive choice affordance - one physical feel across the
// whole decision shell rather than per-button tuning.
const CHOICE_SPRING = { type: "spring" as const, stiffness: 400, damping: 25 };

// Every decision option gets the exact same treatment - a hairline border with a signal-amber
// hover/focus state - regardless of `action.kind` or position. No option should visually stand
// out from the others, so nothing here can be read as a hint toward the "right" or "safe" choice.
function choiceButtonClasses(isDark: boolean): string {
  return isDark
    ? "border-slate-800 bg-slate-900 text-slate-200 hover:border-signal focus-visible:border-signal"
    : "border-slate-200 bg-white text-slate-700 hover:border-signal focus-visible:border-signal";
}

function formatHudKey(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function formatCountdown(secondsRemaining: number): string {
  const overtime = secondsRemaining < 0;
  const abs = Math.abs(secondsRemaining);
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  const clock = `${m}:${s.toString().padStart(2, "0")}`;
  return overtime ? `+${clock}` : clock;
}

export default function SimulationShell({ state, onAction }: SimulationShellProps) {
  const [freeform, setFreeform] = useState("");
  const [secondsRemaining, setSecondsRemaining] = useState(DECISION_WINDOW_SECONDS);
  const stepStartRef = useRef(0);
  const hudEntries = Object.entries(state.hudMetrics).filter(([, v]) => v !== undefined);

  const isDark = state.ui_mode === "CYBERSECURITY" || state.ui_mode === "QUANT_TRADING";

  // Reset the per-step decision clock whenever a new step arrives. The only setState call is
  // inside the setInterval callback (subscribing to an external timer, the sanctioned pattern) -
  // stepStartRef.current is a ref write, not state, and Date.now() only runs post-render here,
  // inside the effect, never during render itself.
  useEffect(() => {
    stepStartRef.current = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - stepStartRef.current) / 1000);
      setSecondsRemaining(DECISION_WINDOW_SECONDS - elapsed);
    }, 1000);
    return () => clearInterval(interval);
  }, [state.currentStep]);

  const handleAction = (actionId: string) => {
    // Derived from the already-ticking countdown state rather than a fresh Date.now() call, so
    // this stays a pure read (at most ~1s of rounding, which is fine for this purpose).
    const elapsedSeconds = Math.max(0, DECISION_WINDOW_SECONDS - secondsRemaining);
    onAction?.(actionId, freeform.trim() || undefined, elapsedSeconds);
    setFreeform("");
  };

  // Numeric keys 1-4 trigger the corresponding decision option, mirroring the [1]-[4] badges.
  useHotkeys(
    "1,2,3,4",
    (_event, handler) => {
      const index = Number(handler.keys?.[0]) - 1;
      const action = state.allowedActions[index];
      if (action) handleAction(action.id);
    },
    { enableOnFormTags: false },
    [state.allowedActions, secondsRemaining]
  );

  const renderView = () => {
    switch (state.ui_mode) {
      case "VENTURE_CAPITAL":
        return <VCSimulationView payload={state.payload} narrativePrompt={state.narrativePrompt} />;
      case "CYBERSECURITY":
        return <CyberSimulationView payload={state.payload} narrativePrompt={state.narrativePrompt} />;
      case "PRODUCT_MANAGEMENT":
        return <ProductSimulationView payload={state.payload} narrativePrompt={state.narrativePrompt} />;
      case "CORPORATE_LAW":
        return <LawSimulationView payload={state.payload} narrativePrompt={state.narrativePrompt} />;
      case "QUANT_TRADING":
        return <QuantSimulationView payload={state.payload} narrativePrompt={state.narrativePrompt} />;
      default:
        return null;
    }
  };

  return (
    <div className={cn("flex h-full min-h-0 flex-col", isDark ? "bg-slate-950" : "bg-slate-100")}>
      {/* Top HUD */}
      <div
        className={cn(
          "flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 border-b px-4 py-2 font-mono text-[11px]",
          isDark ? "border-slate-800 bg-slate-900 text-slate-300" : "border-slate-200 bg-white text-slate-600"
        )}
      >
        <span className="border border-signal px-2 py-1 font-semibold uppercase tracking-wider text-signal">
          TRACK: {state.careerType}
        </span>
        <span
          className={cn(
            "border px-2 py-1 font-semibold uppercase tracking-wider",
            isDark ? "border-slate-700 text-slate-300" : "border-slate-200 text-slate-600"
          )}
        >
          STEP: {String(state.currentStep ?? 1).padStart(2, "0")}
        </span>
        <span
          className={cn(
            "flex items-center gap-1 border px-2 py-1 font-semibold tabular-nums transition-colors",
            secondsRemaining <= 15
              ? "border-signal/50 bg-signal/10 text-signal"
              : isDark
                ? "border-slate-700 bg-slate-800 text-slate-300"
                : "border-slate-200 bg-slate-100 text-slate-600"
          )}
          title="Time taken on this step is factored into your final evaluation"
        >
          <Timer className="h-3 w-3" />
          {formatCountdown(secondsRemaining)}
        </span>
        <div className="flex flex-wrap items-center gap-4 sm:ml-auto">
          {hudEntries.map(([key, value]) => {
            const Icon = HUD_ICON[key];
            return (
              <span key={key} className="flex items-center gap-1">
                {Icon && <Icon className="h-3.5 w-3.5 opacity-70" />}
                <span className="opacity-70">{formatHudKey(key)}:</span>
                <span className="font-semibold">{value}</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Mode-specific view with animated transitions */}
      <div className="relative min-h-0 flex-1 overflow-hidden p-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={state.ui_mode}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="h-full min-h-0"
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Tactical decision bar */}
      <div
        className={cn(
          "shrink-0 border-t px-4 py-3",
          isDark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"
        )}
      >
        <p className={cn("mb-3 text-xs", isDark ? "text-slate-400" : "text-slate-500")}>{state.narrativePrompt}</p>

        <div className="flex flex-col gap-2">
          {state.allowedActions.map((action, index) => (
            <motion.button
              key={action.id}
              onClick={() => handleAction(action.id)}
              title={action.description}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              transition={CHOICE_SPRING}
              className={cn(
                "flex min-h-11 w-full items-center gap-2.5 border px-3 py-2.5 text-left text-sm font-medium transition-colors",
                choiceButtonClasses(isDark)
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center border font-mono text-[10px] font-semibold",
                  isDark ? "border-slate-700 text-slate-400" : "border-slate-300 text-slate-500"
                )}
              >
                {index + 1}
              </span>
              <Send className="h-3.5 w-3.5 shrink-0 opacity-60" />
              <span className="flex-1">{action.label}</span>
            </motion.button>
          ))}

          <input
            value={freeform}
            onChange={(e) => setFreeform(e.target.value)}
            placeholder="Type a response or justification..."
            className={cn(
              "min-h-11 w-full border px-3 py-2 text-sm outline-none transition-colors",
              isDark
                ? "border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-signal"
                : "border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:border-signal"
            )}
          />
        </div>
      </div>
    </div>
  );
}
