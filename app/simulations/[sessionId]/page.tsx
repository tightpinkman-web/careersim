"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, AlertTriangle, Trophy, History } from "lucide-react";
import SimulationShell from "@/components/simulations/SimulationShell";
import { readSimulationStream } from "@/lib/sseClient";
import type { SimulationState } from "@/types/simulation";

type SessionStatus = "IN_PROGRESS" | "COMPLETED";

interface RecoveredSnapshot {
  state: SimulationState;
  status: SessionStatus;
  savedAt: number;
}

/** Soft cap so a resume from days ago doesn't silently reappear - just an instant-paint/offline
 *  convenience, not durable storage (the server GET below is always the source of truth). */
const RECOVERY_MAX_AGE_MS = 6 * 60 * 60 * 1000;

function recoveryKey(sessionId: string) {
  return `sim_session_${sessionId}`;
}

function readRecoveredSnapshot(sessionId: string): RecoveredSnapshot | null {
  try {
    const raw = sessionStorage.getItem(recoveryKey(sessionId));
    if (!raw) return null;
    const snapshot = JSON.parse(raw) as RecoveredSnapshot;
    if (Date.now() - snapshot.savedAt > RECOVERY_MAX_AGE_MS) return null;
    return snapshot;
  } catch {
    return null;
  }
}

function saveSnapshot(sessionId: string, state: SimulationState, status: SessionStatus) {
  try {
    sessionStorage.setItem(
      recoveryKey(sessionId),
      JSON.stringify({ state, status, savedAt: Date.now() } satisfies RecoveredSnapshot)
    );
  } catch {
    // sessionStorage unavailable (private browsing, quota, etc.) - resume just won't be available.
  }
}

export default function ActiveSimulationPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;

  // Optimistic local recovery: a lazy initializer (not an effect) is a synchronous, one-time read
  // of already-existing sessionStorage state, so a reload after a crash/network drop repaints the
  // student's last known position on the very first render instead of a blank loading screen.
  const [initialSnapshot] = useState<RecoveredSnapshot | null>(() => readRecoveredSnapshot(sessionId));

  const [state, setState] = useState<SimulationState | null>(initialSnapshot?.state ?? null);
  const [status, setStatus] = useState<SessionStatus | null>(initialSnapshot?.status ?? null);
  const [loading, setLoading] = useState(initialSnapshot === null);
  const [submitting, setSubmitting] = useState(false);
  const [streamingPreview, setStreamingPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recovered, setRecovered] = useState(initialSnapshot !== null);
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
        setRecovered(false);
        setError(null);
        saveSnapshot(sessionId, data.state, data.status);
      } catch (err) {
        if (ignore) return;
        // If we already recovered a local snapshot, keep showing it instead of a hard error.
        if (!initialSnapshot) {
          setError(err instanceof Error ? err.message : "Failed to load simulation session.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [sessionId, reloadToken, initialSnapshot]);

  const retry = useCallback(() => {
    setLoading(true);
    setReloadToken((t) => t + 1);
  }, []);

  const handleAction = useCallback(
    async (actionId: string, freeformInput?: string, elapsedSeconds?: number) => {
      if (submitting) return;
      const action = freeformInput ? `${actionId}: ${freeformInput}` : actionId;

      setSubmitting(true);
      setStreamingPreview(null);
      setError(null);
      try {
        const res = await fetch("/api/simulations/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, action, decisionTimeSeconds: elapsedSeconds }),
        });
        const { state: nextState } = await readSimulationStream(res, (event) => {
          if (event.type === "delta") setStreamingPreview(event.narrativePreview);
        });
        setState(nextState);
        setRecovered(false);
        const nextStatus: SessionStatus = nextState.isComplete ? "COMPLETED" : "IN_PROGRESS";
        setStatus(nextStatus);
        saveSnapshot(sessionId, nextState, nextStatus);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to submit your decision.");
      } finally {
        setSubmitting(false);
        setStreamingPreview(null);
      }
    },
    [sessionId, submitting]
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-obsidian font-display">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-sm">Loading simulation session...</p>
        </div>
      </div>
    );
  }

  if (error && !state) {
    return (
      <div className="flex h-full items-center justify-center bg-obsidian font-display">
        <div className="flex max-w-sm flex-col items-center gap-3 text-center text-slate-300">
          <AlertTriangle className="h-6 w-6 text-rose-400" />
          <p className="text-sm">{error}</p>
          <button
            onClick={retry}
            className="min-h-11 border border-signal bg-signal px-3 py-1.5 text-xs font-medium text-obsidian hover:opacity-90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!state) return null;

  return (
    <div className="relative flex h-full flex-col bg-obsidian font-display">
      {status === "COMPLETED" && (
        <div className="flex items-center gap-3 border-b border-hairline bg-surface px-4 py-2 font-mono text-xs text-signal">
          <Trophy className="h-4 w-4 shrink-0" />
          <div>
            <span className="font-semibold">Simulation complete.</span>
            {typeof state.overallScore === "number" && <span> Score: {state.overallScore}/100.</span>}
            {state.feedbackSummary && <span> {state.feedbackSummary}</span>}
          </div>
        </div>
      )}

      {error && recovered && (
        <div className="flex items-center gap-2 border-b border-amber-900 bg-amber-950/40 px-4 py-2 text-xs text-amber-300">
          <History className="h-3.5 w-3.5 shrink-0" />
          Showing your last saved progress - reconnect to continue. ({error})
        </div>
      )}

      {error && !recovered && (
        <div className="flex items-center gap-2 border-b border-rose-900 bg-rose-950/40 px-4 py-2 text-xs text-rose-300">
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
              className="absolute inset-0 z-50 flex items-center justify-center bg-obsidian/60 backdrop-blur-sm"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex max-w-md flex-col items-center gap-3 border border-hairline bg-surface px-6 py-5"
              >
                <Loader2 className="h-6 w-6 animate-spin text-signal" />
                <p className="text-sm font-medium text-slate-300">
                  {streamingPreview || "Waiting for the Game Master..."}
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
