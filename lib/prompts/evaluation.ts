import type { CareerType, SimulationMode } from "@/types/simulation";

export interface EvaluationTurn {
  stepSequence: number;
  studentInput: string;
  /** The full SimulationState JSON persisted on ActionLog.returnedState for this turn. */
  returnedState: unknown;
  /** Seconds the student took to respond to this step, measured against a 60s decision window.
   *  null/undefined for the initial SESSION_START turn or any turn predating this field. */
  decisionTimeSeconds?: number | null;
}

const DECISION_WINDOW_SECONDS = 60;

/**
 * The exact 4 competency dimensions each career's evaluation must score, in both audiences.
 * "professional" names the dimension the way an industry practitioner would; "child" tests the
 * same underlying skill but in plain, jargon-free language appropriate for a 10th-12th grader
 * exploring the career, not yet working in it.
 */
const CAREER_COMPETENCY_DIMENSIONS: Record<CareerType, Record<SimulationMode, [string, string, string, string]>> = {
  VENTURE_CAPITAL: {
    professional: ["Unit Economics Analysis", "Risk Identification", "Thesis Articulation", "Speed"],
    child: ["Understanding the Numbers", "Spotting Red Flags", "Explaining Your Reasoning", "Decision Speed"],
  },
  CYBERSECURITY: {
    professional: [
      "Threat Triage Accuracy",
      "Containment Sequencing",
      "Technical Command Proficiency",
      "Decision Speed Under Pressure",
    ],
    child: [
      "Spotting the Problem",
      "Doing Things in the Right Order",
      "Following Instructions Precisely",
      "Staying Calm Under Pressure",
    ],
  },
  PRODUCT_MANAGEMENT: {
    professional: [
      "Root Cause Diagnosis",
      "Prioritization Discipline",
      "Resource Constraint Management",
      "Data-Driven Reasoning",
    ],
    child: [
      "Finding the Real Problem",
      "Choosing What Matters Most",
      "Working Within Limits",
      "Using Evidence to Decide",
    ],
  },
  CORPORATE_LAW: {
    professional: [
      "Clause Risk Detection",
      "Negotiation Strategy",
      "Precision of Drafting Language",
      "Client Interest Alignment",
    ],
    child: ["Spotting Unfair Terms", "Negotiating Fairly", "Careful Reading & Writing", "Looking Out for Your Client"],
  },
  QUANT_TRADING: {
    professional: [
      "Risk Parameter Discipline",
      "Volatility Reasoning",
      "Pattern Recognition",
      "Decisiveness Under Uncertainty",
    ],
    child: [
      "Managing Risk Wisely",
      "Understanding Ups and Downs",
      "Spotting Patterns",
      "Making Decisions Under Pressure",
    ],
  },
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

const MODE_EVALUATION_TONE: Record<SimulationMode, string> = {
  professional:
    "Grade them like a rigorous, fair manager conducting a real performance review - specific, evidence-based, and unafraid to be critical where the transcript warrants it.",
  child:
    "Grade them like an encouraging but honest mentor talking to a high schooler exploring this career, not a working professional. Write every field - competency names aside, which are fixed - in simple, jargon-free language a 10th-12th grader would understand. Focus on aptitude and potential (logical reasoning, communication, problem-solving process), not on technical mastery they haven't been taught yet. Still be honest in growthAreas - encouraging does not mean uncritical.",
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

  const timeLine =
    typeof turn.decisionTimeSeconds === "number"
      ? `Time taken to decide: ${turn.decisionTimeSeconds}s (${
          turn.decisionTimeSeconds <= DECISION_WINDOW_SECONDS
            ? `within the ${DECISION_WINDOW_SECONDS}s decision window`
            : `${turn.decisionTimeSeconds - DECISION_WINDOW_SECONDS}s over the ${DECISION_WINDOW_SECONDS}s decision window`
        })`
      : "Time taken to decide: not recorded for this step";

  return [
    `--- Step ${turn.stepSequence} ---`,
    `Situation the student faced: ${state?.narrativePrompt ?? "n/a"}`,
    `Options offered: ${optionsOffered}`,
    `HUD metrics at this point: ${hud}`,
    `Student's actual decision: ${turn.studentInput}`,
    timeLine,
  ].join("\n");
}

/**
 * Builds the system + user prompt pair for the post-simulation evaluation call. The system
 * prompt fixes the persona, the 4 competency dimensions (mode-specific naming), tone (mode-
 * specific), and the strict JSON output contract; the user prompt embeds the complete ActionLog
 * turn-by-turn transcript for this session.
 */
export function buildEvaluationPrompt(
  careerType: CareerType,
  mode: SimulationMode,
  turns: EvaluationTurn[]
): { system: string; user: string } {
  const [dim1, dim2, dim3, dim4] = CAREER_COMPETENCY_DIMENSIONS[careerType][mode];

  const system = `You are an expert evaluator and career coach assessing a student's performance in a
${careerType.replace(/_/g, " ")} career simulation, having observed their complete turn-by-turn
decision history. ${MODE_EVALUATION_TONE[mode]}

Base every judgment strictly on the transcript you are given. Cite what the student actually chose,
not what a hypothetical ideal student would have chosen. Do not be generically positive - if the
transcript shows the student missed something important, say so plainly in growthAreas.

TIME PRESSURE
Each step in the transcript below records how long the student took to decide against a ${DECISION_WINDOW_SECONDS}s
decision window (real professionals in this field rarely get unlimited time to think). Factor time
efficiency and decisive action under pressure into overallScore, not just the correctness of the
final call: a student who consistently blew well past the window, even while reaching reasonable
conclusions, should score lower than one who reasoned just as well within it. Conversely, a student
who rushed to a shallow or wrong decision purely to beat the clock should not be rewarded for speed
alone. Where a career's competency dimensions include a speed/pressure-related one (e.g. "Speed",
"Decision Speed Under Pressure", "Decisiveness Under Uncertainty"), let the timing data drive that
score specifically; where none of the 4 dimensions are timing-related, still let timing pull
overallScore up or down, and mention it explicitly in keyStrengths or growthAreas when it was a
notable factor (consistently fast and sound, or consistently over time and hesitant).

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
