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
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-slate-100 px-4 text-center">
      <Sparkles className="h-8 w-8 text-indigo-500" />
      <h1 className="text-lg font-semibold text-slate-800">Your evaluation isn&apos;t ready yet</h1>
      <p className="max-w-sm text-sm text-slate-500">
        Generate a career aptitude assessment based on your complete decision history for this session.
      </p>
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-rose-600">
          <AlertTriangle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
      <button
        onClick={runEvaluation}
        disabled={pending}
        className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {pending ? "Evaluating your performance..." : "Generate My Evaluation"}
      </button>
    </div>
  );
}
