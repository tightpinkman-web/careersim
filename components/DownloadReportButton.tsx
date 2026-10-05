"use client";

import { useState } from "react";
import { Download, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DownloadReportButtonProps {
  sessionId: string;
  /** "prominent" is a larger, higher-contrast treatment for hero placements; "default" suits a
   *  toolbar or card. */
  variant?: "default" | "prominent";
}

interface ExportPdfResponse {
  status: "ready";
  pdfUrl: string;
  error?: string;
  code?: string;
}

/**
 * Delegates PDF generation entirely to app/api/simulations/export-pdf/route.ts (server-rendered,
 * cached on Supabase Storage once per session) instead of rendering it client-side on every click.
 * The first request for a session pays the render cost; every request after that - another click,
 * a different tab, a page revisit - is a cache hit and the CDN URL comes back immediately.
 */
export default function DownloadReportButton({ sessionId, variant = "default" }: DownloadReportButtonProps) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    if (generating) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/simulations/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data: ExportPdfResponse = await res.json();
      if (!res.ok || data.status !== "ready") {
        throw new Error(data.error ?? "Failed to generate the PDF report.");
      }

      // Direct CDN download - no client-side PDF re-render, no object URL to revoke.
      const link = document.createElement("a");
      link.href = data.pdfUrl;
      link.download = `Career_Aptitude_Report_${sessionId}.pdf`;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate the PDF report.");
    } finally {
      setGenerating(false);
    }
  };

  const isProminent = variant === "prominent";

  return (
    <div className={cn("flex flex-col gap-1", isProminent ? "items-center" : "items-center sm:items-end")}>
      <button
        onClick={handleDownload}
        disabled={generating}
        className={cn(
          "flex items-center gap-2 font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-60",
          isProminent
            ? "rounded-lg bg-indigo-600 px-6 py-3.5 text-base shadow-indigo-200 ring-4 ring-indigo-100"
            : "rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-medium"
        )}
      >
        {generating ? (
          <Loader2 className={cn("animate-spin", isProminent ? "h-5 w-5" : "h-4 w-4")} />
        ) : (
          <Download className={isProminent ? "h-5 w-5" : "h-4 w-4"} />
        )}
        {generating ? (
          <span className="font-mono text-xs uppercase tracking-wide">COMPILING ENTERPRISE REPORT PDF...</span>
        ) : (
          "Download Official Assessment Report (PDF)"
        )}
      </button>
      {error && (
        <p className="flex items-center gap-1 text-xs text-rose-600">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
