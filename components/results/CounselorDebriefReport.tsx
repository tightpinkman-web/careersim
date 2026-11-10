import { Document, Page, Text, View, StyleSheet, Font, Svg, Path, Rect } from "@react-pdf/renderer";
import type { SimulationMode } from "@/types/simulation";
import type { TelemetrySnapshot } from "@/lib/telemetry/tracker";
import type { VCTelemetrySnapshot } from "@/lib/telemetry/vc-tracker";

// Same fix as components/AssessmentPdfReport.tsx - duplicated rather than imported since these are
// two independently-rendered @react-pdf/renderer documents and the fix is a two-line Font call, not
// worth a cross-report module for. Disables the default hyphenation engine's soft-hyphen injection,
// which Helvetica's WinAnsi encoding has no glyph for and which was rendering as garbled characters.
Font.registerHyphenationCallback((word) => [word]);

/** Same WinAnsi-safety normalization as components/AssessmentPdfReport.tsx's sanitizeText -
 *  duplicated for the same reason (see comment above), applied to every dynamic string here before
 *  it reaches a <Text> node. */
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
    .replace(/ /g, " ")
    .replace(/[•●◦‣]/g, "-")
    .replace(/[^\x20-\x7E¡-ÿ\n]/g, "")
    .trim();
}

export interface CounselorDebriefReportProps {
  sessionId: string;
  careerTitle: string;
  mode: SimulationMode;
  generatedDate: Date;
  overallScore: number;
  competencies: Record<string, number>;
  keyStrengths: string[];
  growthAreas: string[];
  /** Aggregated micro-behavioral telemetry (lib/telemetry/tracker.ts) submitted alongside the
   *  /evaluate call - null for a session that completed before this field existed, or if the
   *  client never had anything to flush (e.g. sessionStorage was unavailable throughout). */
  telemetry: TelemetrySnapshot | null;
  /** VC Associate-track-only micro-behavioral telemetry (lib/telemetry/vc-tracker.ts) - null for
   *  every other career, or a VC session where nothing was ever recorded. Drives the Non-Consensus
   *  Index and its own guided reflection prompts on page 2, additively alongside the generic
   *  telemetry section above rather than replacing it. */
  vcTelemetry?: VCTelemetrySnapshot | null;
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
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  platformName: { fontSize: 16, fontWeight: 700, color: COLORS.ink },
  platformNameAccent: { color: COLORS.muted },
  reportTitle: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  headerMetaBlock: { alignItems: "flex-end" },
  headerMetaLine: { fontSize: 9, color: COLORS.muted, marginBottom: 2 },
  confidentialBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    fontSize: 9,
    fontWeight: 700,
    backgroundColor: "#1e293b",
    color: "#ffffff",
  },
  careerTitle: { fontSize: 18, fontWeight: 700, color: COLORS.ink, marginBottom: 6 },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: COLORS.ink, marginBottom: 8, marginTop: 18 },
  sectionSubtitle: { fontSize: 9, color: COLORS.muted, marginBottom: 10, lineHeight: 1.4 },
  profileRow: { flexDirection: "row", gap: 12 },
  profileCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    padding: 14,
    alignItems: "center",
  },
  profileScore: { fontSize: 26, fontWeight: 700, color: COLORS.indigo },
  profileLabel: { fontSize: 9, color: COLORS.muted, marginTop: 4, textAlign: "center" },
  barRow: { marginBottom: 12 },
  barLabelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  barLabel: { fontSize: 9, color: COLORS.slate },
  barValue: { fontSize: 9, fontWeight: 700, color: COLORS.ink },
  barTrack: { height: 7, borderRadius: 4, backgroundColor: COLORS.track },
  barFill: { height: 7, borderRadius: 4, backgroundColor: COLORS.indigo },
  statGrid: { flexDirection: "row", gap: 10, marginBottom: 14 },
  statCard: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, padding: 10, alignItems: "center" },
  statValue: { fontSize: 16, fontWeight: 700, color: COLORS.ink },
  statLabel: { fontSize: 8, color: COLORS.muted, marginTop: 3, textAlign: "center" },
  promptCard: {
    borderWidth: 1,
    borderColor: COLORS.indigo,
    backgroundColor: COLORS.indigoLight,
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  promptIndex: { fontSize: 9, fontWeight: 700, color: COLORS.indigo, marginBottom: 2 },
  promptText: { fontSize: 9.5, lineHeight: 1.4, color: COLORS.ink },
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
  pageNumber: { position: "absolute", bottom: 24, right: 40, fontSize: 8, color: COLORS.muted },
});

/** Dimension names are fixed per career (see lib/prompts/evaluation.ts's CAREER_COMPETENCY_DIMENSIONS)
 *  but vary by career and audience mode, so Cognitive Profile Mapping can't key off exact labels.
 *  Instead it buckets every competency by keyword into "technical execution under pressure" (speed,
 *  precision, risk/pattern handling, technical command) vs. "stakeholder communication" (articulation,
 *  negotiation, client/stakeholder alignment). A dimension matching neither bucket is left out of
 *  both rather than guessed into one - the resulting score is an average over whatever matched. */
const TECHNICAL_PRESSURE_PATTERN = /speed|pressure|technical|risk|precision|pattern|execution|discipline|diagnosis|detection|velocity|volatility|sequenc/i;
const STAKEHOLDER_COMMUNICATION_PATTERN = /communicat|articulat|negotiat|client|stakeholder|alignment|draft|interest|explain|reasoning/i;

function averageMatching(competencies: Record<string, number>, pattern: RegExp, fallback: number): number {
  const matched = Object.entries(competencies).filter(([label]) => pattern.test(label));
  if (matched.length === 0) return fallback;
  return Math.round(matched.reduce((sum, [, value]) => sum + value, 0) / matched.length);
}

interface DiscussionPrompt {
  text: string;
}

/** Builds counselor-facing coaching questions grounded in this specific student's telemetry
 *  drop-offs (not generic career advice) - a slow/fast decision cadence, a high strategic-pivot
 *  count, or thin information-gathering each produce a distinct, targeted prompt. Falls back to
 *  growth-area-grounded prompts when there's no telemetry to draw from at all. */
function buildDiscussionPrompts(telemetry: TelemetrySnapshot | null, growthAreas: string[]): DiscussionPrompt[] {
  const prompts: DiscussionPrompt[] = [];

  if (!telemetry) {
    growthAreas.forEach((area) => prompts.push({ text: `Ask the student to walk through a moment where this applied: "${area}"` }));
    return prompts.length > 0 ? prompts : [{ text: "No telemetry was captured for this session - use the growth areas above to guide the discussion." }];
  }

  if (telemetry.averageDecisionSeconds >= 50) {
    prompts.push({
      text: `This student averaged ${telemetry.averageDecisionSeconds}s per decision, close to or over the 60s window. Ask them to describe what they were weighing in those extra seconds - was it genuine analysis, or hesitation?`,
    });
  } else if (telemetry.averageDecisionSeconds > 0 && telemetry.averageDecisionSeconds <= 12) {
    prompts.push({
      text: `This student averaged just ${telemetry.averageDecisionSeconds}s per decision. Ask them to walk back through one fast call and explain the reasoning they skipped over out loud - was it instinct, or a shortcut?`,
    });
  }

  if (telemetry.strategicPivotCount >= 3) {
    prompts.push({
      text: `This student changed strategic approach ${telemetry.strategicPivotCount} times across the session (e.g. switching between cautious and aggressive options). Ask what triggered each pivot - new information, or a reaction to pressure?`,
    });
  } else if (telemetry.strategicPivotCount === 0) {
    prompts.push({
      text: "This student held one consistent strategic approach for the entire session. Ask them what would have made them reconsider it - were there moments that should have prompted a change of plan?",
    });
  }

  if (telemetry.totalInformationGatherEvents === 0) {
    prompts.push({
      text: "This student didn't open a single email, log, or exhibit before deciding. Ask them how they'd normally gather context before a high-stakes call at work, and whether time pressure here changed that habit.",
    });
  } else if (telemetry.totalInformationGatherEvents <= 2) {
    prompts.push({
      text: `This student reviewed only ${telemetry.totalInformationGatherEvents} piece(s) of supporting evidence across the whole session. Ask which specific decision they'd revisit if they'd read more before committing.`,
    });
  } else {
    prompts.push({
      text: `This student reviewed ${telemetry.totalInformationGatherEvents} pieces of supporting evidence (emails, logs, exhibits) before deciding. Ask them to name the single most useful one and why it changed their call.`,
    });
  }

  growthAreas.slice(0, 1).forEach((area) => prompts.push({ text: `Tie it back to the evaluation: "${area}" - ask for a concrete example from their own run.` }));

  return prompts;
}

/**
 * Non-Consensus Index (0-100): a VC-specific coaching heuristic, not a real finance methodology -
 * it rewards the three concrete signals that distinguish a structure-first, conviction-driven
 * analyst from one who follows momentum: holding a thesis under the Managing Partner's pushback
 * (lib/simulation/vc/PartnerDefense.tsx), not reacting instantly to the Inbound Hub's FOMO rival
 * term-sheet alert, and reaching for ownership/structure math (the Term Sheet Builder) before
 * anything else. Returns null when there's no VC telemetry to score at all.
 */
function calculateNonConsensusIndex(vc: VCTelemetrySnapshot): number {
  let score = 0;
  if (vc.partnerConvictionHeld === true) score += 40;
  if (vc.fomoPanicLatencySeconds === null || vc.fomoPanicLatencySeconds >= 15) score += 30;
  if (vc.openedCapTableFirst === true) score += 30;
  return score;
}

/** Guided reflection prompts specific to the VC track's own telemetry drop-offs, appended after the
 *  generic discussion prompts above rather than replacing them. */
function buildVCDiscussionPrompts(vc: VCTelemetrySnapshot): DiscussionPrompt[] {
  const prompts: DiscussionPrompt[] = [];

  if (vc.partnerConvictionHeld === false) {
    prompts.push({
      text: "This student revised their valuation/terms as soon as the Managing Partner pushed back in the Defense Room. Ask them to separate what changed their mind: new information the partner raised, or just social pressure from a senior voice disagreeing.",
    });
  } else if (vc.partnerConvictionHeld === true) {
    prompts.push({
      text: "This student held their position under the Managing Partner's critique. Ask them to defend that same thesis again, out loud, as if the critique had been even sharper - was their conviction earned, or stubborn?",
    });
  }

  if (vc.fomoPanicLatencySeconds !== null && vc.fomoPanicLatencySeconds < 15) {
    prompts.push({
      text: `This student made their next move just ${vc.fomoPanicLatencySeconds}s after the rival term-sheet FOMO alert fired. Ask what specifically they re-evaluated in that window - or whether the alert itself made the decision for them.`,
    });
  }

  if (vc.openedCapTableFirst === false) {
    prompts.push({
      text: "This student opened another tool before the Term Sheet Builder's ownership/structure math. Ask them to walk through what they were trying to establish first, and whether it's the sequence they'd use on a real deal.",
    });
  }

  if (vc.modelTweaksCount >= 8) {
    prompts.push({
      text: `This student iterated on their own unit-economics/term-sheet model ${vc.modelTweaksCount} times. Ask which single tweak changed their read on the deal the most.`,
    });
  }

  return prompts;
}

function ReportHeader({ sessionId, generatedDate }: { sessionId: string; generatedDate: Date }) {
  return (
    <View style={styles.headerRow}>
      <View style={styles.brandRow}>
        <Svg width={18} height={18} viewBox="0 0 32 32">
          <Rect x="1" y="1" width="30" height="30" rx="7" fill={COLORS.ink} />
          <Path d="M9 23L21 11M21 17L21 11L15 11" stroke="white" strokeWidth={2.25} strokeLinecap="square" strokeLinejoin="miter" />
        </Svg>
        <View>
          <Text style={styles.platformName}>
            Career<Text style={styles.platformNameAccent}>Sim</Text>
          </Text>
          <Text style={styles.reportTitle}>Counselor Debrief Pack</Text>
        </View>
      </View>
      <View style={styles.headerMetaBlock}>
        <Text style={styles.headerMetaLine}>Session ID: {sessionId}</Text>
        <Text style={styles.headerMetaLine}>
          Date Generated: {generatedDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </Text>
        <Text style={styles.confidentialBadge}>For Counselor Use Only</Text>
      </View>
    </View>
  );
}

function ReportFooter() {
  return <Text style={styles.footer}>Generated via AI Career Simulation Engine - Counselor Debrief Pack - not shared with students</Text>;
}

/**
 * Counselor-facing companion to components/AssessmentPdfReport.tsx (the student-facing scorecard).
 * Never shown to students - it exists to turn micro-behavioral telemetry (lib/telemetry/tracker.ts)
 * into material a counselor can actually use in a 1:1: a Cognitive Profile Mapping that separates
 * technical execution under pressure from stakeholder communication, and Guided Discussion Prompts
 * tailored to this specific student's telemetry drop-offs rather than generic career advice.
 */
export default function CounselorDebriefReport({
  sessionId,
  careerTitle,
  generatedDate,
  overallScore,
  competencies,
  growthAreas,
  telemetry,
  vcTelemetry,
}: CounselorDebriefReportProps) {
  const technicalPressureScore = averageMatching(competencies, TECHNICAL_PRESSURE_PATTERN, overallScore);
  const stakeholderCommunicationScore = averageMatching(competencies, STAKEHOLDER_COMMUNICATION_PATTERN, overallScore);
  const competencyEntries = Object.entries(competencies);
  const discussionPrompts = buildDiscussionPrompts(telemetry, growthAreas);

  // Only a real VC session has any of these three signals - a non-VC career, or a VC session where
  // nothing was ever recorded, leaves hasVcSignal false so the section below is omitted entirely
  // rather than showing a misleading "Non-Consensus Index: 0".
  const hasVcSignal = Boolean(
    vcTelemetry &&
      (vcTelemetry.partnerConvictionHeld !== null || vcTelemetry.fomoPanicLatencySeconds !== null || vcTelemetry.modelTweaksCount > 0)
  );
  const nonConsensusIndex = hasVcSignal && vcTelemetry ? calculateNonConsensusIndex(vcTelemetry) : null;
  const vcDiscussionPrompts = hasVcSignal && vcTelemetry ? buildVCDiscussionPrompts(vcTelemetry) : [];

  return (
    <Document title={`Counselor Debrief Pack - ${sanitizeText(careerTitle)}`} author="AI Career Simulator" subject="Counselor Debrief Pack">
      {/* Page 1: Cognitive Profile Mapping + competency matrix */}
      <Page size="A4" style={styles.page}>
        <ReportHeader sessionId={sessionId} generatedDate={generatedDate} />

        <Text style={styles.careerTitle}>{sanitizeText(careerTitle)}</Text>

        <Text style={styles.sectionTitle}>Cognitive Profile Mapping</Text>
        <Text style={styles.sectionSubtitle}>
          Derived from this session&apos;s scored competencies, grouped into two coaching-relevant lenses rather than the raw
          per-career dimension names below.
        </Text>
        <View style={styles.profileRow}>
          <View style={styles.profileCard}>
            <Text style={styles.profileScore}>{technicalPressureScore}</Text>
            <Text style={styles.profileLabel}>Technical Execution{"\n"}Under Pressure (/100)</Text>
          </View>
          <View style={styles.profileCard}>
            <Text style={styles.profileScore}>{stakeholderCommunicationScore}</Text>
            <Text style={styles.profileLabel}>Stakeholder{"\n"}Communication (/100)</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Scored Competency Matrix</Text>
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

      {/* Page 2: behavioral telemetry + guided discussion prompts */}
      <Page size="A4" style={styles.page}>
        <ReportHeader sessionId={sessionId} generatedDate={generatedDate} />

        <Text style={styles.sectionTitle}>Behavioral Telemetry</Text>
        {telemetry ? (
          <View style={styles.statGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{telemetry.averageDecisionSeconds}s</Text>
              <Text style={styles.statLabel}>Avg. Time to Decide</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{telemetry.totalInformationGatherEvents}</Text>
              <Text style={styles.statLabel}>Evidence Items Reviewed</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{telemetry.strategicPivotCount}</Text>
              <Text style={styles.statLabel}>Strategic Pivots</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{telemetry.medianDecisionSeconds}s</Text>
              <Text style={styles.statLabel}>Median Time to Decide</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.sectionSubtitle}>No telemetry was captured for this session.</Text>
        )}

        {hasVcSignal && vcTelemetry && (
          <>
            <Text style={styles.sectionTitle}>Non-Consensus Index</Text>
            <Text style={styles.sectionSubtitle}>
              A VC-track coaching heuristic (not a real finance methodology) rewarding conviction under pushback, a
              measured (non-panicked) reaction to FOMO pressure, and a structure-first analytical approach.
            </Text>
            <View style={styles.statGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{nonConsensusIndex}/100</Text>
                <Text style={styles.statLabel}>Non-Consensus Index</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {vcTelemetry.partnerConvictionHeld === null ? "N/A" : vcTelemetry.partnerConvictionHeld ? "Held" : "Revised"}
                </Text>
                <Text style={styles.statLabel}>Conviction Under Pushback</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {vcTelemetry.fomoPanicLatencySeconds === null ? "N/A" : `${vcTelemetry.fomoPanicLatencySeconds}s`}
                </Text>
                <Text style={styles.statLabel}>FOMO Reaction Time</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{vcTelemetry.modelTweaksCount}</Text>
                <Text style={styles.statLabel}>Model Tweaks</Text>
              </View>
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>Guided Discussion Prompts</Text>
        <Text style={styles.sectionSubtitle}>
          Tailored to this student&apos;s specific telemetry drop-offs - use these to open a 1:1 debrief, not as a script.
        </Text>
        {[...discussionPrompts, ...vcDiscussionPrompts].map((prompt, i) => (
          <View key={i} style={styles.promptCard}>
            <Text style={styles.promptIndex}>Discussion Prompt {i + 1}</Text>
            <Text style={styles.promptText}>{sanitizeText(prompt.text)}</Text>
          </View>
        ))}

        <ReportFooter />
        <Text style={styles.pageNumber}>Page 2 of 2</Text>
      </Page>
    </Document>
  );
}
