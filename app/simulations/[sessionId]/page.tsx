"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Trophy, History, RotateCcw } from "lucide-react";
import SimulationShell from "@/components/simulations/SimulationShell";
import { readSimulationStream, SimulationStreamError } from "@/lib/sseClient";
import { getAnonymousSessionId } from "@/lib/anonymousSession";
import { ageTierForMode, type AgeTier, type SimulationMode, type SimulationState } from "@/types/simulation";

type SessionStatus = "IN_PROGRESS" | "COMPLETED";

interface RecoveredSnapshot {
  state: SimulationState;
  status: SessionStatus;
  mode: SimulationMode;
  ageTier: AgeTier;
  savedAt: number;
}

interface DisplayError {
  code: string;
  message: string;
}

interface LastActionArgs {
  actionId: string;
  freeformInput?: string;
  elapsedSeconds?: number;
}

/** Soft cap so a resume from days ago doesn't silently reappear - just an instant-paint/offline
 *  convenience, not durable storage (the server GET below is always the source of truth). */
const RECOVERY_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const MAX_AUTO_RETRIES = 3;
const AUTO_RETRY_DELAY_MS = 1500;

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

function saveSnapshot(
  sessionId: string,
  state: SimulationState,
  status: SessionStatus,
  mode: SimulationMode,
  ageTier: AgeTier
) {
  try {
    sessionStorage.setItem(
      recoveryKey(sessionId),
      JSON.stringify({ state, status, mode, ageTier, savedAt: Date.now() } satisfies RecoveredSnapshot)
    );
  } catch {
    // sessionStorage unavailable (private browsing, quota, etc.) - resume just won't be available.
  }
}

/** Status codes meaning "the session itself is the problem" (vs. a one-off engine/network
 *  hiccup on an otherwise-healthy session) - these are the ones worth attempting a reconnect for. */
function isSessionLostCode(code: string): boolean {
  return code === "SESSION_NOT_FOUND";
}

/** Maps a raw server/network error onto one of the two masked, dark-mode monospaced status
 *  badges - raw backend strings ("No session found for the given sessionId.", "Gemini returned a
 *  response that was not valid JSON.", "Game Master call failed: ...") never reach the UI. */
function maskError(error: DisplayError): string {
  return isSessionLostCode(error.code)
    ? "SESSION_RECONNECTING // SYNCING STATE WITH SERVER..."
    : "NETWORK_CONGESTION // RETRYING DECISION EVALUATION...";
}

function toDisplayError(err: unknown, fallbackMessage: string): DisplayError {
  if (err instanceof SimulationStreamError) return { code: err.code, message: err.message };
  return { code: "UNKNOWN", message: err instanceof Error ? err.message : fallbackMessage };
}

export default function ActiveSimulationPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const sessionId = params.sessionId;

  // Optimistic local recovery: a lazy initializer (not an effect) is a synchronous, one-time read
  // of already-existing sessionStorage state, so a reload after a crash/network drop repaints the
  // student's last known position on the very first render instead of a blank loading screen.
  const [initialSnapshot] = useState<RecoveredSnapshot | null>(() => readRecoveredSnapshot(sessionId));

  const [state, setState] = useState<SimulationState | null>(initialSnapshot?.state ?? null);
  const [status, setStatus] = useState<SessionStatus | null>(initialSnapshot?.status ?? null);
  const [mode, setMode] = useState<SimulationMode | null>(initialSnapshot?.mode ?? null);
  const [ageTier, setAgeTier] = useState<AgeTier | null>(initialSnapshot?.ageTier ?? null);
  const [loading, setLoading] = useState(initialSnapshot === null);
  const [submitting, setSubmitting] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [streamingPreview, setStreamingPreview] = useState<string | null>(null);
  const [error, setError] = useState<DisplayError | null>(null);
  const [recovered, setRecovered] = useState(initialSnapshot !== null);
  const [reloadToken, setReloadToken] = useState(0);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<LastActionArgs | null>(null);
  const [showResumeCta, setShowResumeCta] = useState(false);
  const [showRetryStepCta, setShowRetryStepCta] = useState(false);

  /** Mints a brand-new, fully validated session via /api/simulations/start (never by trusting a
   *  client-asserted sessionId/state pair as history - see the Phase 1 writeup) seeded with the
   *  career/mode this browser was last known to be running, then transparently swaps the URL over
   *  to it. Used only after the original session is confirmed unrecoverable server-side. */
  const attemptReconnect = useCallback(
    async (snapshot: RecoveredSnapshot) => {
      setReconnecting(true);
      try {
        const res = await fetch("/api/simulations/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            anonymousSessionId: getAnonymousSessionId(),
            careerType: snapshot.state.careerType,
            mode: snapshot.mode,
            ageTier: ageTierForMode(snapshot.mode),
          }),
        });
        const { sessionId: newSessionId } = await readSimulationStream(res);
        router.replace(`/simulations/${newSessionId}`);
      } catch {
        setReconnecting(false);
        setShowResumeCta(true);
      }
    },
    [router]
  );

  const loadSession = useCallback(async () => {
    for (let attempt = 0; attempt <= MAX_AUTO_RETRIES; attempt++) {
      try {
        const res = await fetch(`/api/simulations/${sessionId}`);
        const data = await res.json();
        if (!res.ok) throw new SimulationStreamError(data.error ?? "Failed to load simulation session.", data.code ?? "UNKNOWN");
        setState(data.state);
        setStatus(data.status);
        setMode(data.mode);
        setAgeTier(data.ageTier);
        setRecovered(false);
        setError(null);
        setShowResumeCta(false);
        saveSnapshot(sessionId, data.state, data.status, data.mode, data.ageTier);
        setLoading(false);
        return;
      } catch (err) {
        const displayError = toDisplayError(err, "Failed to load simulation session.");
        setError(displayError);
        if (attempt < MAX_AUTO_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, AUTO_RETRY_DELAY_MS));
          continue;
        }
        // Retries exhausted. If the session itself is gone and we know what it was running,
        // reconnect transparently instead of dead-ending the student.
        const snapshot = initialSnapshot;
        if (isSessionLostCode(displayError.code) && snapshot) {
          setLoading(false);
          await attemptReconnect(snapshot);
        } else {
          setLoading(false);
          setShowResumeCta(true);
        }
      }
    }
  }, [sessionId, initialSnapshot, attemptReconnect]);

  useEffect(() => {
    // reloadToken is bumped by the manual "RESUME SIMULATION" CTA to re-run this from scratch.
    void (async () => {
      await loadSession();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, reloadToken]);

  const resumeSimulation = useCallback(() => {
    setLoading(true);
    setShowResumeCta(false);
    setError(null);
    setReloadToken((t) => t + 1);
  }, []);

  const handleAction = useCallback(
    async (actionId: string, freeformInput?: string, elapsedSeconds?: number) => {
      if (submitting) return;
      const action = freeformInput ? `${actionId}: ${freeformInput}` : actionId;

      setPendingActionId(actionId);
      setLastAction({ actionId, freeformInput, elapsedSeconds });
      setSubmitting(true);
      setShowRetryStepCta(false);
      setStreamingPreview(null);
      setError(null);

      for (let attempt = 0; attempt <= MAX_AUTO_RETRIES; attempt++) {
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
          setError(null);
          setPendingActionId(null);
          setLastAction(null);
          const nextStatus: SessionStatus = nextState.isComplete ? "COMPLETED" : "IN_PROGRESS";
          setStatus(nextStatus);
          if (mode && ageTier) saveSnapshot(sessionId, nextState, nextStatus, mode, ageTier);
          setSubmitting(false);
          setStreamingPreview(null);
          return;
        } catch (err) {
          const displayError = toDisplayError(err, "Failed to submit your decision.");
          setError(displayError);
          if (attempt < MAX_AUTO_RETRIES) {
            await new Promise((resolve) => setTimeout(resolve, AUTO_RETRY_DELAY_MS));
            continue;
          }
          setSubmitting(false);
          setStreamingPreview(null);
          setShowRetryStepCta(true);
        }
      }
    },
    [sessionId, submitting, mode, ageTier]
  );

  const retryStep = useCallback(() => {
    if (!lastAction) return;
    setShowRetryStepCta(false);
    handleAction(lastAction.actionId, lastAction.freeformInput, lastAction.elapsedSeconds);
  }, [lastAction, handleAction]);

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

  if ((reconnecting || showResumeCta) && !state) {
    return (
      <div className="flex h-full items-center justify-center bg-obsidian font-display">
        <div className="flex max-w-sm flex-col items-center gap-3 text-center text-slate-300">
          {reconnecting ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin text-signal" />
              <p className="font-mono text-xs uppercase tracking-wide text-signal">
                SESSION_RECONNECTING // SYNCING STATE WITH SERVER...
              </p>
            </>
          ) : (
            <>
              <History className="h-6 w-6 text-signal" />
              <p className="font-mono text-xs uppercase tracking-wide text-slate-400">
                SESSION_UNAVAILABLE // MANUAL_RESUME_REQUIRED
              </p>
              <button
                onClick={resumeSimulation}
                className="flex min-h-11 items-center gap-2 border border-signal bg-signal px-3 py-1.5 font-mono text-xs font-medium uppercase tracking-wide text-obsidian hover:opacity-90"
              >
                <RotateCcw className="h-3.5 w-3.5" />[ RESUME SIMULATION ]
              </button>
            </>
          )}
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

      {recovered && !error && (
        <div className="flex items-center gap-2 border-b border-amber-900 bg-amber-950/40 px-4 py-2 font-mono text-xs uppercase tracking-wide text-amber-300">
          <History className="h-3.5 w-3.5 shrink-0" />
          SHOWING_LOCAL_PROGRESS // CONFIRMING WITH SERVER...
        </div>
      )}

      {error && (
        <div
          className={cnError(isSessionLostCode(error.code))}
        >
          {isSessionLostCode(error.code) ? (
            <History className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
          )}
          <span className="font-mono uppercase tracking-wide">{maskError(error)}</span>
        </div>
      )}

      {showRetryStepCta && (
        <div className="flex items-center justify-center gap-3 border-b border-hairline bg-surface px-4 py-2">
          <button
            onClick={retryStep}
            className="flex min-h-11 items-center gap-2 border border-signal bg-signal px-3 py-1.5 font-mono text-xs font-medium uppercase tracking-wide text-obsidian hover:opacity-90"
          >
            <RotateCcw className="h-3.5 w-3.5" />[ RETRY STEP ]
          </button>
        </div>
      )}

      {showResumeCta && !showRetryStepCta && (
        <div className="flex items-center justify-center gap-3 border-b border-hairline bg-surface px-4 py-2">
          <button
            onClick={resumeSimulation}
            className="flex min-h-11 items-center gap-2 border border-signal bg-signal px-3 py-1.5 font-mono text-xs font-medium uppercase tracking-wide text-obsidian hover:opacity-90"
          >
            <RotateCcw className="h-3.5 w-3.5" />[ RESUME SIMULATION ]
          </button>
        </div>
      )}

      <div className="relative min-h-0 flex-1">
        <SimulationShell state={state} onAction={handleAction} pendingActionId={pendingActionId} />

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

function cnError(sessionLost: boolean): string {
  return sessionLost
    ? "flex items-center gap-2 border-b border-amber-900 bg-amber-950/40 px-4 py-2 text-xs text-amber-300"
    : "flex items-center gap-2 border-b border-rose-900 bg-rose-950/40 px-4 py-2 text-xs text-rose-300";
}
