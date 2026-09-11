import type { CareerType } from "@/types/simulation";

export interface EvaluationTurn {
  stepSequence: number;
  studentInput: string;
  /** The full SimulationState JSON persisted on ActionLog.returnedState for this turn. */
  returnedState: unknown;
}

/**
 * The exact 4 competency dimensions each career's evaluation must score. Tailored to what
 * actually distinguishes strong performers in that career's daily reality.
 */
const CAREER_COMPETENCY_DIMENSIONS: Record<CareerType, [string, string, string, string]> = {
  VENTURE_CAPITAL: ["Unit Economics Analysis", "Risk Identification", "Thesis Articulation", "Speed"],
  CYBERSECURITY: [
    "Threat Triage Accuracy",
    "Containment Sequencing",
    "Technical Command Proficiency",
    "Decision Speed Under Pressure",
  ],
  PRODUCT_MANAGEMENT: [
    "Root Cause Diagnosis",
    "Prioritization Discipline",
    "Resource Constraint Management",
    "Data-Driven Reasoning",
  ],
  CORPORATE_LAW: [
    "Clause Risk Detection",
    "Negotiation Strategy",
    "Precision of Drafting Language",
    "Client Interest Alignment",
  ],
  QUANT_TRADING: [
    "Risk Parameter Discipline",
    "Volatility Reasoning",
    "Pattern Recognition",
    "Decisiveness Under Uncertainty",
  ],
};

const CAREER_REALITY_FRAME: Record<CareerType, string> = {
  VENTURE_CAPITAL:
    "the daily reality of VC work: reading between the lines of founder communications, spotting metrics that don't hold up under scrutiny, and making high-conviction calls with incomplete information under time pressure",
  CYBERSECURITY:
    "the daily reality of SOC work: triaging ambiguous signals under active attack, sequencing containment actions correctly the first time, and staying technically precise while the pressure to act fast increases",
  PRODUCT_MANAGEMENT:
    "the daily reality of PM work: diagnosing root causes from noisy data, saying no to good ideas because of hard resource constraints, and defending prioritization calls with evidence rather than instinct",
  CORPORATE_LAW:
    "the daily reality of corporate law: catching adversarial drafting buried in boilerplate, negotiating from principle rather than position, and protecting client interests without derailing the deal",
  QUANT_TRADING:
    "the daily reality of a trading desk: managing risk parameters actively rather than passively, reasoning correctly about volatility regimes, and making decisive calls when the market is moving against you",
};

function formatTurnForTranscript(turn: EvaluationTurn): string {
  const state = turn.returnedState as
    | {
        narrativePrompt?: string;
        hudMetrics?: Record<string, unknown>;
        allowedActions?: { id: string; label: string }[];
      }
    | null
    | undefined;

  const optionsOffered = state?.allowedActions?.map((a) => a.label).join(", ") ?? "n/a";
  const hud = state?.hudMetrics ? JSON.stringify(state.hudMetrics) : "n/a";

  return [
    `--- Step ${turn.stepSequence} ---`,
    `Situation the student faced: ${state?.narrativePrompt ?? "n/a"}`,
    `Options offered: ${optionsOffered}`,
    `HUD metrics at this point: ${hud}`,
    `Student's actual decision: ${turn.studentInput}`,
  ].join("\n");
}

/**
 * Builds the system + user prompt pair for the post-simulation evaluation call. The system
 * prompt fixes the persona, the 4 competency dimensions, and the strict JSON output contract;
 * the user prompt embeds the complete ActionLog turn-by-turn transcript for this session.
 */
export function buildEvaluationPrompt(
  careerType: CareerType,
  turns: EvaluationTurn[]
): { system: string; user: string } {
  const [dim1, dim2, dim3, dim4] = CAREER_COMPETENCY_DIMENSIONS[careerType];

  const system = `You are an expert evaluator and career coach assessing a student's performance in a
${careerType.replace(/_/g, " ")} career simulation, having observed their complete turn-by-turn
decision history. Your job is to grade them like a rigorous, fair manager conducting a real
performance review - specific, evidence-based, and calibrated against ${CAREER_REALITY_FRAME[careerType]}.

Base every judgment strictly on the transcript you are given. Cite what the student actually chose,
not what a hypothetical ideal student would have chosen. Do not be generically positive - if the
transcript shows the student missed something important, say so plainly in growthAreas.

OUTPUT FORMAT - NON-NEGOTIABLE
Respond with ONLY valid JSON, no markdown fences, no commentary before or after. The object must
match exactly:

{
  "overallScore": number,          // 0-100, holistic performance across the whole session
  "competencies": {
    "${dim1}": number,             // 0-100
    "${dim2}": number,             // 0-100
    "${dim3}": number,             // 0-100
    "${dim4}": number              // 0-100
  },
  "keyStrengths": [string, string, string],   // exactly 3 specific, evidence-based positive observations citing actual decisions from the transcript
  "growthAreas": [string, string],            // exactly 2 specific, actionable improvements for their analytical approach, grounded in specific moments in the transcript
  "careerFitSummary": string       // exactly 3 sentences: a verdict on how this student's decision style matches ${CAREER_REALITY_FRAME[careerType]}
}

Rules:
- competencies must contain exactly these 4 keys, spelled exactly as shown: "${dim1}", "${dim2}", "${dim3}", "${dim4}".
- keyStrengths must have exactly 3 entries, growthAreas exactly 2.
- careerFitSummary must be exactly 3 sentences - no more, no fewer.
- Do not wrap the JSON in code fences. Output the raw JSON object and nothing else.`;

  const user = [
    `Here is the complete decision history for this ${careerType.replace(/_/g, " ")} simulation session, in order:`,
    "",
    ...turns.map(formatTurnForTranscript),
    "",
    "Evaluate this student's performance now.",
  ].join("\n");

  return { system, user };
}
