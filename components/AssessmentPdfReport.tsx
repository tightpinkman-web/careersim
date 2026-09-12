import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import type { SimulationMode } from "@/types/simulation";

// @react-pdf/renderer's default hyphenation engine splits long words at line-wraps by inserting
// a soft-hyphen character that Helvetica's WinAnsi encoding has no glyph for, which is what was
// actually causing "corrupted"/garbled characters to show up mid-sentence in generated reports.
// Returning the word unsplit disables that injection point entirely.
Font.registerHyphenationCallback((word) => [word]);

/**
 * AI-generated report text (career fit summaries, strengths, growth areas) routinely contains
 * "smart" typographic punctuation - curly quotes, em/en dashes, ellipses - plus the occasional
 * stray HTML entity. None of that is in Helvetica's WinAnsi encoding, so it would render as
 * garbled boxes or mojibake. This normalizes every dynamic string down to plain, WinAnsi-safe
 * text before it reaches a <Text> node; nothing outside that range survives.
 */
function sanitizeText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'")
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/ /g, " ")
    .replace(/[•●◦‣]/g, "-")
    .replace(/[^\x20-\x7E¡-ÿ\n]/g, "")
    .trim();
}

export interface AssessmentPdfReportProps {
  sessionId: string;
  careerTitle: string;
  mode: SimulationMode;
  generatedDate: Date;
  overallScore: number;
  competencies: Record<string, number>;
  keyStrengths: string[];
  growthAreas: string[];
  careerFitSummary: string;
}

const COLORS = {
  ink: "#0f172a",
  slate: "#334155",
  muted: "#64748b",
  border: "#e2e8f0",
  indigo: "#4338ca",
  indigoLight: "#eef2ff",
  emerald: "#059669",
  emeraldLight: "#ecfdf5",
  amber: "#b45309",
  amberLight: "#fffbeb",
  track: "#e2e8f0",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 40,
    fontSize: 10,
    color: COLORS.slate,
    fontFamily: "Helvetica",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: COLORS.indigo,
    paddingBottom: 12,
    marginBottom: 20,
  },
  platformName: {
    fontSize: 16,
    fontWeight: 700,
    color: COLORS.indigo,
  },
  reportTitle: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },
  headerMetaBlock: {
    alignItems: "flex-end",
  },
  headerMetaLine: {
    fontSize: 9,
    color: COLORS.muted,
    marginBottom: 2,
  },
  modeBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    fontSize: 9,
    fontWeight: 700,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: COLORS.ink,
    marginBottom: 8,
    marginTop: 18,
  },
  careerTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: COLORS.ink,
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    padding: 14,
    alignItems: "center",
  },
  summaryScore: {
    fontSize: 28,
    fontWeight: 700,
    color: COLORS.indigo,
  },
  summaryLabel: {
    fontSize: 9,
    color: COLORS.muted,
    marginTop: 4,
    textAlign: "center",
  },
  barRow: {
    marginBottom: 12,
  },
  barLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  barLabel: {
    fontSize: 9,
    color: COLORS.slate,
  },
  barValue: {
    fontSize: 9,
    fontWeight: 700,
    color: COLORS.ink,
  },
  barTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.track,
  },
  barFill: {
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.indigo,
  },
  listCard: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 14,
    marginBottom: 14,
  },
  listCardTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 8,
  },
  listItemRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  bullet: {
    width: 10,
    fontSize: 9,
  },
  listItemText: {
    flex: 1,
    fontSize: 9.5,
    lineHeight: 1.4,
  },
  fitCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    padding: 14,
    marginTop: 4,
  },
  fitText: {
    fontSize: 10,
    lineHeight: 1.5,
    color: COLORS.ink,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: COLORS.muted,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },
  pageNumber: {
    position: "absolute",
    bottom: 24,
    right: 40,
    fontSize: 8,
    color: COLORS.muted,
  },
});

function ReportHeader({
  sessionId,
  generatedDate,
  mode,
}: {
  sessionId: string;
  generatedDate: Date;
  mode: SimulationMode;
}) {
  const isChild = mode === "child";
  return (
    <View style={styles.headerRow}>
      <View>
        <Text style={styles.platformName}>AI Career Simulator</Text>
        <Text style={styles.reportTitle}>Official Career Aptitude Assessment Report</Text>
      </View>
      <View style={styles.headerMetaBlock}>
        <Text style={styles.headerMetaLine}>Session ID: {sessionId}</Text>
        <Text style={styles.headerMetaLine}>
          Date Generated: {generatedDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </Text>
        <Text
          style={[
            styles.modeBadge,
            isChild
              ? { backgroundColor: COLORS.emeraldLight, color: COLORS.emerald }
              : { backgroundColor: "#1e293b", color: "#ffffff" },
          ]}
        >
          {isChild ? "Child / Aptitude Focus" : "Professional"}
        </Text>
      </View>
    </View>
  );
}

function ReportFooter() {
  return <Text style={styles.footer}>Generated via AI Career Simulation Engine — B2B Partner Portal</Text>;
}

export default function AssessmentPdfReport({
  sessionId,
  careerTitle,
  mode,
  generatedDate,
  overallScore,
  competencies,
  keyStrengths,
  growthAreas,
  careerFitSummary,
}: AssessmentPdfReportProps) {
  const competencyEntries = Object.entries(competencies);
  const decisionAccuracy =
    competencyEntries.length > 0
      ? Math.round(competencyEntries.reduce((sum, [, v]) => sum + v, 0) / competencyEntries.length)
      : overallScore;

  return (
    <Document
      title={`Career Aptitude Report - ${sanitizeText(careerTitle)}`}
      author="AI Career Simulator"
      subject="Career Aptitude Assessment"
    >
      {/* Page 1: header, executive summary, competency matrix */}
      <Page size="A4" style={styles.page}>
        <ReportHeader sessionId={sessionId} generatedDate={generatedDate} mode={mode} />

        <Text style={styles.careerTitle}>{sanitizeText(careerTitle)}</Text>

        <Text style={styles.sectionTitle}>Executive Summary</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryScore}>{overallScore}</Text>
            <Text style={styles.summaryLabel}>Overall Career{"\n"}Readiness Score (/100)</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryScore}>{decisionAccuracy}%</Text>
            <Text style={styles.summaryLabel}>Decision Accuracy{"\n"}(avg. across competencies)</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Competency Matrix</Text>
        {competencyEntries.map(([label, value]) => (
          <View key={label} style={styles.barRow}>
            <View style={styles.barLabelRow}>
              <Text style={styles.barLabel}>{sanitizeText(label)}</Text>
              <Text style={styles.barValue}>{value}/100</Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${Math.max(0, Math.min(100, value))}%` }]} />
            </View>
          </View>
        ))}

        <ReportFooter />
        <Text style={styles.pageNumber}>Page 1 of 2</Text>
      </Page>

      {/* Page 2: strengths, growth areas, career fit */}
      <Page size="A4" style={styles.page}>
        <ReportHeader sessionId={sessionId} generatedDate={generatedDate} mode={mode} />

        <Text style={styles.sectionTitle}>Top Strengths</Text>
        <View style={[styles.listCard, { borderColor: COLORS.emerald, backgroundColor: COLORS.emeraldLight }]}>
          <Text style={[styles.listCardTitle, { color: COLORS.emerald }]}>Key Strengths Demonstrated</Text>
          {keyStrengths.map((strength, i) => (
            <View key={i} style={styles.listItemRow}>
              <Text style={[styles.bullet, { color: COLORS.emerald }]}>•</Text>
              <Text style={[styles.listItemText, { color: "#065f46" }]}>{sanitizeText(strength)}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Key Growth Areas</Text>
        <View style={[styles.listCard, { borderColor: COLORS.amber, backgroundColor: COLORS.amberLight }]}>
          <Text style={[styles.listCardTitle, { color: COLORS.amber }]}>Areas for Development</Text>
          {growthAreas.map((area, i) => (
            <View key={i} style={styles.listItemRow}>
              <Text style={[styles.bullet, { color: COLORS.amber }]}>•</Text>
              <Text style={[styles.listItemText, { color: "#78350f" }]}>{sanitizeText(area)}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Career Reality Fit</Text>
        <View style={styles.fitCard}>
          <Text style={styles.fitText}>{sanitizeText(careerFitSummary)}</Text>
        </View>

        <ReportFooter />
        <Text style={styles.pageNumber}>Page 2 of 2</Text>
      </Page>
    </Document>
  );
}
