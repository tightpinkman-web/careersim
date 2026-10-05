import Groq, { APIError as GroqAPIError } from "groq-sdk";
import { z } from "zod";
import {
  generateStructuredStream as generateGeminiStream,
  describeGeminiError,
  StructuredResponseError,
  type ChatTurn,
  type StructuredStreamEvent,
} from "@/lib/gemini";

export type { ChatTurn, StructuredStreamEvent };

let client: Groq | null = null;

/**
 * Lazily constructs (and caches) the Groq client on first use inside a request handler, for the
 * same build-time reason lib/gemini.ts's getGeminiClient() is lazy: eagerly throwing/constructing
 * at module-evaluation time would fail `next build`'s route-collection pass wherever
 * GROQ_API_KEY isn't set yet.
 */
export function getGroqClient(): Groq {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not set on the server. Add it to your environment configuration.");
  }
  if (!client) {
    client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return client;
}

// Groq's LPU inference makes this the fastest model on their hosted catalog suitable for
// structured JSON output - traded for Gemini's larger context/reasoning depth, which is why every
// entry point here fails over to Gemini rather than erroring out.
export const GROQ_GAME_MASTER_MODEL = "llama-3.1-8b-instant";
export const GROQ_MAX_TOKENS = 8192;

function toGroqMessages(system: string, turns: ChatTurn[]) {
  return [
    { role: "system" as const, content: system },
    ...turns.map((turn) => ({
      role: (turn.role === "model" ? "assistant" : "user") as "assistant" | "user",
      content: turn.text,
    })),
  ];
}

/** Same best-effort progressive-preview extraction lib/gemini.ts uses, duplicated here (rather
 *  than shared) only because it's a two-line regex - not worth a cross-provider import for. */
function extractNarrativePreview(buffer: string): string | null {
  const match = buffer.match(/"narrativePrompt"\s*:\s*"((?:[^"\\]|\\.)*)/);
  if (!match) return null;
  try {
    return JSON.parse(`"${match[1]}"`);
  } catch {
    return null;
  }
}

/**
 * Streams a structured Game Master turn from Groq (llama-3.1-8b-instant), yielding the same
 * `{type: "delta"}` / `{type: "done"}` event shape as lib/gemini.ts's generateStructuredStream, so
 * callers (app/api/simulations/start and action routes) can treat the two providers
 * interchangeably. On ANY failure - auth, rate limit, malformed JSON, schema mismatch, or a
 * mid-stream drop - this transparently fails over to the Gemini implementation instead of
 * throwing, so a Groq outage is never client-visible as an engine error by itself (only if BOTH
 * providers fail does the caller see a thrown StructuredResponseError/ApiError).
 */
export async function* generateSimulationStream<S extends z.ZodTypeAny>(options: {
  system: string;
  turns: ChatTurn[];
  schema: S;
  maxOutputTokens?: number;
}): AsyncGenerator<StructuredStreamEvent<S>> {
  const { system, turns, schema, maxOutputTokens = GROQ_MAX_TOKENS } = options;

  try {
    const stream = await getGroqClient().chat.completions.create({
      model: GROQ_GAME_MASTER_MODEL,
      messages: toGroqMessages(system, turns),
      stream: true,
      max_tokens: maxOutputTokens,
      response_format: { type: "json_object" },
    });

    let buffer = "";
    let lastPreview = "";
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content;
      if (!text) continue;
      buffer += text;

      const preview = extractNarrativePreview(buffer);
      if (preview && preview !== lastPreview) {
        lastPreview = preview;
        yield { type: "delta", narrativePreview: preview };
      }
    }

    if (!buffer) {
      throw new StructuredResponseError("Groq returned an empty response.");
    }

    let raw: unknown;
    try {
      raw = JSON.parse(buffer);
    } catch {
      throw new StructuredResponseError("Groq returned a response that was not valid JSON.");
    }

    const result = schema.safeParse(raw);
    if (!result.success) {
      throw new StructuredResponseError(`Groq's response did not match the expected schema: ${result.error.message}`);
    }

    yield { type: "done", data: result.data };
    return;
  } catch (err) {
    console.error("[lib/llm/provider] Groq stream failed, failing over to Gemini:", err);
  }

  yield* generateGeminiStream({ system, turns, schema, maxOutputTokens });
}

const TurnMetricsSchema = z.object({
  turnScore: z.number().min(0).max(100),
  hudMetricDeltas: z.record(z.string(), z.number()).optional(),
});

export type TurnMetrics = z.infer<typeof TurnMetricsSchema>;

const METRICS_SYSTEM_PROMPT = `You are a fast scoring engine for a career simulation. Given the
conversation history and the student's most recent choice, respond with ONLY a single JSON object
(no markdown, no prose) of the exact shape:
{"turnScore": <integer 0-100, how well-reasoned the student's last decision was>, "hudMetricDeltas": {<optional numeric deltas to apply to HUD metrics, may be omitted or empty>}}`;

/** Clamps to [0, 100] and never throws - the deterministic fallback used when both the Groq call
 *  and its JSON/schema validation fail, so turn scoring always resolves to a number instead of
 *  blocking the simulation. Derives a stable, plausible mid-range score from the length of the
 *  student's response (a longer, more deliberated answer skews slightly higher) rather than a
 *  fixed constant, so repeated fallbacks don't all look identical in the HUD/evaluation data. */
function deterministicTurnScore(lastChoice: string): TurnMetrics {
  const lengthBonus = Math.min(20, Math.floor(lastChoice.trim().length / 4));
  return { turnScore: Math.min(100, 55 + lengthBonus) };
}

/**
 * Rapid, non-streaming turn evaluation via Groq (llama-3.1-8b-instant, `response_format:
 * json_object`) - used to cheaply (re-)score the student's last decision independent of whatever
 * turnScore the main Game Master stream produced. Never throws: a Groq error, rate limit, or
 * malformed/out-of-schema response all fall back to deterministicTurnScore() instead of
 * propagating a client-visible exception.
 */
export async function evaluateTurnMetrics(history: ChatTurn[], lastChoice: string): Promise<TurnMetrics> {
  try {
    const response = await getGroqClient().chat.completions.create({
      model: GROQ_GAME_MASTER_MODEL,
      messages: [
        ...toGroqMessages(METRICS_SYSTEM_PROMPT, history),
        { role: "user" as const, content: `The student's most recent choice: ${lastChoice}` },
      ],
      stream: false,
      max_tokens: 256,
      response_format: { type: "json_object" },
    });

    const text = response.choices[0]?.message?.content;
    if (!text) throw new StructuredResponseError("Groq returned an empty metrics response.");

    const raw = JSON.parse(text);
    const result = TurnMetricsSchema.safeParse(raw);
    if (!result.success) {
      throw new StructuredResponseError(`Groq's metrics response did not match the expected shape: ${result.error.message}`);
    }
    return result.data;
  } catch (err) {
    console.error("[lib/llm/provider] Groq turn evaluation failed, using deterministic fallback:", err);
    return deterministicTurnScore(lastChoice);
  }
}

export function describeLLMError(err: unknown): string {
  if (err instanceof GroqAPIError) return `Game Master call failed: ${err.message}`;
  return describeGeminiError(err);
}
