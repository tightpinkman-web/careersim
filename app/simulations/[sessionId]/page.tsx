"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, AlertTriangle, Trophy } from "lucide-react";
import SimulationShell from "@/components/simulations/SimulationShell";
import type { SimulationState } from "@/types/simulation";

type SessionStatus = "IN_PROGRESS" | "COMPLETED";

export default function ActiveSimulationPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;

  const [state, setState] = useState<SimulationState | null>(null);
  const [status, setStatus] = useState<SessionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let ignore = false;

    (async () => {
      try {
        const res = await fetch(`/api/simulations/${sessionId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load simulation session.");
        if (ignore) return;
        setState(data.state);
        setStatus(data.status);
        setError(null);
      } catch (err) {
        if (ignore) return;
        setError(err instanceof Error ? err.message : "Failed to load simulation session.");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [sessionId, reloadToken]);

  const retry = useCallback(() => {
    setLoading(true);
    setReloadToken((t) => t + 1);
  }, []);

  const handleAction = useCallback(
    async (actionId: string, freeformInput?: string) => {
      if (submitting) return;
      const action = freeformInput ? `${actionId}: ${freeformInput}` : actionId;

      setSubmitting(true);
      setError(null);
      try {
        const res = await fetch("/api/simulations/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, action }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to submit your decision.");
        setState(data.state);
        if (data.state?.isComplete) setStatus("COMPLETED");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to submit your decision.");
      } finally {
        setSubmitting(false);
      }
    },
    [sessionId, submitting]
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-100">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-sm">Loading simulation session...</p>
        </div>
      </div>
    );
  }

  if (error && !state) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-100">
        <div className="flex max-w-sm flex-col items-center gap-3 text-center text-slate-600">
          <AlertTriangle className="h-6 w-6 text-rose-500" />
          <p className="text-sm">{error}</p>
          <button
            onClick={retry}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!state) return null;

  return (
    <div className="relative flex h-full flex-col bg-slate-100">
      {status === "COMPLETED" && (
        <div className="flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
          <Trophy className="h-4 w-4 shrink-0" />
          <div>
            <span className="font-semibold">Simulation complete.</span>
            {typeof state.overallScore === "number" && <span> Score: {state.overallScore}/100.</span>}
            {state.feedbackSummary && <span> {state.feedbackSummary}</span>}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 border-b border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="relative min-h-0 flex-1">
        <SimulationShell state={state} onAction={handleAction} />

        <AnimatePresence>
          {submitting && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center gap-3 rounded-lg bg-white px-6 py-5 shadow-xl"
              >
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                <p className="text-sm font-medium text-slate-700">Waiting for the Game Master...</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
