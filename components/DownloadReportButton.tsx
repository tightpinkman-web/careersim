"use client";

import { useState } from "react";
import { Download, Loader2, AlertTriangle } from "lucide-react";
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

  return (
    <div className="flex flex-col items-center gap-1 sm:items-end">
      <button
        onClick={handleDownload}
        disabled={generating}
        className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
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
