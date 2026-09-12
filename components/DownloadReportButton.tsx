"use client";

import { useState } from "react";
import { Download, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SimulationMode } from "@/types/simulation";

interface DownloadReportButtonProps {
  sessionId: string;
  careerTitle: string;
  mode: SimulationMode;
  overallScore: number;
  competencies: Record<string, number>;
  keyStrengths: string[];
  growthAreas: string[];
  careerFitSummary: string;
  /** "prominent" is a larger, higher-contrast treatment for hero placements; "default" suits a
   *  toolbar or card. */
  variant?: "default" | "prominent";
}

/**
 * Generates the PDF entirely inside this click handler - @react-pdf/renderer and
 * AssessmentPdfReport are both dynamically imported here rather than statically at the top of
 * this file, so neither is part of the initial page bundle and neither ever renders during SSR
 * (avoiding both the bundle-size cost and any hydration-mismatch risk from a library that
 * assumes a browser environment).
 */
export default function DownloadReportButton({
  sessionId,
  careerTitle,
  mode,
  overallScore,
  competencies,
  keyStrengths,
  growthAreas,
  careerFitSummary,
  variant = "default",
}: DownloadReportButtonProps) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    if (generating) return;
    setGenerating(true);
    setError(null);
    try {
      const [{ pdf }, { default: AssessmentPdfReport }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/AssessmentPdfReport"),
      ]);

      const blob = await pdf(
        <AssessmentPdfReport
          sessionId={sessionId}
          careerTitle={careerTitle}
          mode={mode}
          generatedDate={new Date()}
          overallScore={overallScore}
          competencies={competencies}
          keyStrengths={keyStrengths}
          growthAreas={growthAreas}
          careerFitSummary={careerFitSummary}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Career_Aptitude_Report_${sessionId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
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
        {generating ? "Generating PDF..." : "Download Official Assessment Report (PDF)"}
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
