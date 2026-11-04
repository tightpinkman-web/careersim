import { z } from "zod";
import { getGroqClient, GROQ_GAME_MASTER_MODEL } from "@/lib/llm/provider";
import { StateDeltaSchema, type StateDelta } from "@/lib/simulation/state-machine";
import type { ChatTurn } from "@/lib/llm/provider";

/**
 * Rigid Zod Schema Enforcement layer for the Deterministic State Engine (see
 * lib/simulation/state-machine.ts). This is a SEPARATE, strict contract from the narrative
 * SimulationState schemas in lib/schemas/simulation.ts (which stay free-form per career track to
 * drive each career's UI payload) - DecisionTurnSchema exists purely to extract a numeric
 * state_delta + a replayable decision-node id out of the model in a shape it cannot deviate from.
 * `.strict()` on every object here means a field the model invents outside this exact shape fails
 * validation instead of being silently accepted.
 */
export const TriggerEventSchema = z
  .object({
    type: z.string().min(1),
    payload: z.unknown(),
  })
  .strict();

export const DecisionTurnSchema = z
  .object({
    state_delta: StateDeltaSchema,
    next_node_id: z.string().min(1),
    trigger_event: TriggerEventSchema,
    narrative_flavor: z.string().min(1),
  })
  .strict();

export type DecisionTurn = z.infer<typeof DecisionTurnSchema>;
export type TriggerEvent = z.infer<typeof TriggerEventSchema>;

const DECISION_TURN_TIMEOUT_MS = 8000;

const DECISION_TURN_SYSTEM_PROMPT = `You are the deterministic state-delta extractor for a career
simulation engine. Given the conversation history and the student's most recent decision, respond
with ONLY a single JSON object (no markdown, no prose) of this EXACT shape and nothing else:
{
  "state_delta": { "cashReserves"?: number, "serverHealthPct"?: number, "portfolioDelta"?: number, "legalLiabilityScore"?: number, "employeeMorale"?: number, "sprintVelocity"?: number },
  "next_node_id": string,
  "trigger_event": { "type": string, "payload": any },
  "narrative_flavor": string
}
Rules:
- state_delta holds ONLY the numeric fields that plausibly changed this turn, as deltas (not absolute values). Omit any field that did not change.
- next_node_id is a short machine-readable id for the decision node this turn represents (e.g. "step-3" or "due-diligence-review").
- trigger_event.type names the kind of event this turn caused (e.g. "none", "incident", "milestone"); payload may be any small JSON value or null.
- narrative_flavor is a one-sentence plain-language gloss of the tone/outcome of this turn (e.g. "The team shipped on time and morale is high.").
- Do not wrap the JSON in code fences. Do not invent fields outside this shape.`;

function toGroqMessages(system: string, turns: ChatTurn[]) {
  return [
    { role: "system" as const, content: system },
    ...turns.map((turn) => ({
      role: (turn.role === "model" ? "assistant" : "user") as "assistant" | "user",
      content: turn.text,
    })),
  ];
}

/** Stable, content-derived fallback used when the Groq call or schema validation fails - never
 *  throws, so a decision turn always resolves to a well-formed DecisionTurn. Proposes no state
 *  change (empty state_delta) rather than guessing, since an unvalidated numeric guess is worse
 *  than no movement for a deterministic engine. */
function deterministicDecisionTurn(lastAction: string, stepSequence: number): DecisionTurn {
  return {
    state_delta: {},
    next_node_id: `step-${stepSequence}`,
    trigger_event: { type: "none", payload: null },
    narrative_flavor: lastAction.trim().slice(0, 140) || "The student made a decision.",
  };
}

/**
 * Requests this turn's rigid state_delta/next_node_id/trigger_event/narrative_flavor from Groq
 * (GROQ_GAME_MASTER_MODEL, `response_format: { type: "json_object" }`), independent of the main
 * narrative Game Master stream (lib/llm/provider.ts's generateSimulationStream). Never throws: a
 * Groq error, timeout, malformed JSON, or schema mismatch all resolve to
 * deterministicDecisionTurn() instead of propagating, matching evaluateTurnMetrics' fallback
 * behavior in lib/llm/provider.ts.
 */
export async function requestDecisionTurn(
  history: ChatTurn[],
  lastAction: string,
  stepSequence: number
): Promise<DecisionTurn> {
  try {
    const response = await getGroqClient().chat.completions.create(
      {
        model: GROQ_GAME_MASTER_MODEL,
        messages: [
          ...toGroqMessages(DECISION_TURN_SYSTEM_PROMPT, history),
          { role: "user" as const, content: `The student's most recent decision: ${lastAction}` },
        ],
        stream: false,
        max_tokens: 512,
        response_format: { type: "json_object" },
      },
      { timeout: DECISION_TURN_TIMEOUT_MS }
    );

    const text = response.choices[0]?.message?.content;
    if (!text) throw new Error("Groq returned an empty decision-turn response.");

    const raw: unknown = JSON.parse(text);
    const result = DecisionTurnSchema.safeParse(raw);
    if (!result.success) {
      throw new Error(`Groq's decision-turn response did not match the rigid schema: ${result.error.message}`);
    }
    return result.data;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[DECISION_TURN_FALLBACK] ${new Date().toISOString()} message="${message}"`);
    return deterministicDecisionTurn(lastAction, stepSequence);
  }
}

export type { StateDelta };
