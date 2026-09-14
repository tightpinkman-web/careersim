"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, AlertTriangle } from "lucide-react";

interface EvaluationTriggerProps {
  sessionId: string;
}

export default function EvaluationTrigger({ sessionId }: EvaluationTriggerProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runEvaluation = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/simulations/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate evaluation.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate evaluation.");
      setPending(false);
    }
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-obsidian px-4 text-center font-display">
      <Sparkles className="h-8 w-8 text-signal" />
      <h1 className="text-lg font-semibold text-ink">Your evaluation isn&apos;t ready yet</h1>
      <p className="max-w-sm text-sm text-slate-400">
        Generate a career aptitude assessment based on your complete decision history for this session.
      </p>
      {error && (
        <p className="flex items-center gap-1.5 border border-rose-900 bg-rose-950/40 px-3 py-2 text-xs text-rose-300">
          <AlertTriangle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
      <button
        onClick={runEvaluation}
        disabled={pending}
        className="flex min-h-11 items-center gap-2 border border-signal bg-signal px-4 py-2.5 text-sm font-medium text-obsidian hover:opacity-90 disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {pending ? "Evaluating your performance..." : "Generate My Evaluation"}
      </button>
    </div>
  );
}
