import { z } from "zod";
import { getGroqClient, GROQ_GAME_MASTER_MODEL } from "@/lib/llm/provider";
import type { ChatTurn } from "@/lib/llm/provider";

/**
 * Rigid Zod Schema Enforcement for the VC Associate simulation's AI Managing Partner, mirroring
 * lib/llm/schemas.ts's DecisionTurnSchema pattern. The Managing Partner is only ever allowed to
 * critique the student's memo and score conviction in this exact shape - it never gets to state or
 * imply a financial figure (valuation, ARR, churn, etc.), since those all live in the deterministic
 * cohort data (lib/simulation/vc-engine.ts) and are never something an LLM call is trusted to
 * restate.
 */
export const VCPartnerTurnSchema = z
  .object({
    memo_critique: z.string().min(1),
    strategic_challenge: z.string().min(1),
    valuation_pushback: z.string().min(1),
    partner_conviction_score: z.number().min(0).max(100),
  })
  .strict();

export type VCPartnerTurn = z.infer<typeof VCPartnerTurnSchema>;

const VC_PARTNER_TIMEOUT_MS = 8000;

const VC_PARTNER_SYSTEM_PROMPT = `You are the Managing Partner reviewing an Associate's investment
memo at a venture fund. Given the conversation history and the Associate's most recent memo or
decision, respond with ONLY a single JSON object (no markdown, no prose) of this EXACT shape and
nothing else:
{
  "memo_critique": string,
  "strategic_challenge": string,
  "valuation_pushback": string,
  "partner_conviction_score": number
}
Rules:
- memo_critique is 1-2 sentences on the quality of the Associate's reasoning, not the startup's numbers.
- strategic_challenge is a pointed question the partner raises to pressure-test the thesis.
- valuation_pushback is the partner's skepticism about the proposed valuation or deal terms, phrased qualitatively (never invent a specific rupee figure or percentage - those are determined elsewhere).
- partner_conviction_score is an integer 0-100 reflecting how convinced the partner is by the Associate's case so far.
- Do not wrap the JSON in code fences. Do not invent fields outside this shape. Do not state specific financial numbers (ARR, churn %, valuation, CAC, LTV) - refer to them only qualitatively.`;

function toGroqMessages(system: string, turns: ChatTurn[]) {
  return [
    { role: "system" as const, content: system },
    ...turns.map((turn) => ({
      role: (turn.role === "model" ? "assistant" : "user") as "assistant" | "user",
      content: turn.text,
    })),
  ];
}

/** Stable fallback used when the Groq call or schema validation fails - never throws, so a partner
 *  turn always resolves to a well-formed VCPartnerTurn. Mirrors deterministicDecisionTurn's
 *  philosophy in lib/llm/schemas.ts: offer a neutral, content-derived response rather than guessing
 *  at a conviction score. */
function deterministicVCPartnerTurn(): VCPartnerTurn {
  return {
    memo_critique: "The partner has noted your latest memo and is reviewing it before the next session.",
    strategic_challenge: "Walk me through why this deal clears our bar relative to the rest of the cohort.",
    valuation_pushback: "The proposed terms will need more justification before this clears investment committee.",
    partner_conviction_score: 50,
  };
}

/**
 * Requests this turn's rigid memo_critique/strategic_challenge/valuation_pushback/
 * partner_conviction_score from Groq (GROQ_GAME_MASTER_MODEL, `response_format: { type:
 * "json_object" }`). Never throws: a Groq error, timeout, malformed JSON, or schema mismatch all
 * resolve to deterministicVCPartnerTurn() instead of propagating, matching requestDecisionTurn's
 * fallback behavior in lib/llm/schemas.ts.
 */
export async function requestVCPartnerTurn(history: ChatTurn[], lastAction: string): Promise<VCPartnerTurn> {
  try {
    const response = await getGroqClient().chat.completions.create(
      {
        model: GROQ_GAME_MASTER_MODEL,
        messages: [
          ...toGroqMessages(VC_PARTNER_SYSTEM_PROMPT, history),
          { role: "user" as const, content: `The Associate's most recent memo or decision: ${lastAction}` },
        ],
        stream: false,
        max_tokens: 512,
        response_format: { type: "json_object" },
      },
      { timeout: VC_PARTNER_TIMEOUT_MS }
    );

    const text = response.choices[0]?.message?.content;
    if (!text) throw new Error("Groq returned an empty VC partner-turn response.");

    const raw: unknown = JSON.parse(text);
    const result = VCPartnerTurnSchema.safeParse(raw);
    if (!result.success) {
      throw new Error(`Groq's VC partner-turn response did not match the rigid schema: ${result.error.message}`);
    }
    return result.data;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[VC_PARTNER_TURN_FALLBACK] ${new Date().toISOString()} message="${message}"`);
    return deterministicVCPartnerTurn();
  }
}
