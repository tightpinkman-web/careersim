"use client";

import { useState } from "react";
import { ClipboardList, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface CounselorDebriefButtonProps {
  sessionId: string;
}

interface ExportDebriefResponse {
  status: "ready";
  pdfUrl: string;
  error?: string;
  code?: string;
}

/**
 * Counselor-only companion to DownloadReportButton: delegates to
 * app/api/simulations/export-counselor-debrief/route.tsx (server-rendered, cached on
 * SimulationSession.counselorDebriefUrl / Supabase Storage exactly like the student scorecard) to
 * download the Cognitive Profile Mapping + Guided Discussion Prompts PDF - never shown to the
 * student, so this sits in the same action bar but is visually distinct (slate, not indigo) to
 * avoid it being mistaken for the student's own report.
 */
export default function CounselorDebriefButton({ sessionId }: CounselorDebriefButtonProps) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    if (generating) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/simulations/export-counselor-debrief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data: ExportDebriefResponse = await res.json();
      if (!res.ok || data.status !== "ready") {
        throw new Error(data.error ?? "Failed to generate the counselor debrief pack.");
      }

      const link = document.createElement("a");
      link.href = data.pdfUrl;
      link.download = `Counselor_Debrief_Pack_${sessionId}.pdf`;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate the counselor debrief pack.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={handleDownload}
        disabled={generating}
        className={cn(
          "flex min-h-11 items-center gap-2 rounded-md border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700 disabled:opacity-60"
        )}
      >
        {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
        {generating ? (
          <span className="font-mono text-xs uppercase tracking-wide">COMPILING DEBRIEF PACK...</span>
        ) : (
          "Counselor Debrief Pack (PDF)"
        )}
      </button>
      {error && (
        <p className="flex items-center gap-1 text-xs text-rose-400">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
