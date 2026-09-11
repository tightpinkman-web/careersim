import { ApiError, GoogleGenAI, type Content } from "@google/genai";
import { z } from "zod";

let client: GoogleGenAI | null = null;

/**
 * Lazily constructs (and caches) the Gemini client on first use inside a request handler -
 * deliberately NOT at module-evaluation time. Next.js's build step imports every route
 * module to collect its config (runtime, dynamic segment config, etc.), so an eager
 * "is the key set" throw or client construction here would fail the production build itself
 * in any environment where GEMINI_API_KEY isn't set yet - e.g. the first deploy, before
 * environment variables are configured on the host.
 */
export function getGeminiClient(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set on the server. Add it to your environment configuration.");
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return client;
}

// gemini-2.5-flash and gemini-1.5-pro are retired for new API keys as of this project's
// deployment window - the API itself returns a 404 pointing at the current model. Verified
// live against the Gemini API before picking this default.
export const GAME_MASTER_MODEL = "gemini-3.6-flash";
export const GAME_MASTER_MAX_TOKENS = 8192;

export interface ChatTurn {
  role: "user" | "model";
  text: string;
}

function toGeminiContents(turns: ChatTurn[]): Content[] {
  return turns.map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] }));
}

export class StructuredResponseError extends Error {}

/**
 * Calls Gemini with a system instruction + conversation turns, constraining output to JSON
 * matching `schema` via `responseJsonSchema` - generated directly from the same Zod schema
 * the result is then validated against (`z.toJSONSchema`), so the contract has one source of
 * truth instead of a hand-duplicated Gemini schema. Throws StructuredResponseError if the
 * model's output isn't valid JSON or doesn't satisfy `schema`.
 */
export async function generateStructured<S extends z.ZodTypeAny>(options: {
  system: string;
  turns: ChatTurn[];
  schema: S;
  model?: string;
  maxOutputTokens?: number;
}): Promise<z.infer<S>> {
  const { system, turns, schema, model = GAME_MASTER_MODEL, maxOutputTokens = GAME_MASTER_MAX_TOKENS } = options;

  const response = await getGeminiClient().models.generateContent({
    model,
    contents: toGeminiContents(turns),
    config: {
      systemInstruction: system,
      responseMimeType: "application/json",
      responseJsonSchema: z.toJSONSchema(schema, { unrepresentable: "any" }),
      maxOutputTokens,
    },
  });

  const text = response.text;
  if (!text) {
    throw new StructuredResponseError("Gemini returned an empty response.");
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new StructuredResponseError("Gemini returned a response that was not valid JSON.");
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new StructuredResponseError(`Gemini's response did not match the expected schema: ${result.error.message}`);
  }

  return result.data;
}

export function statusForGeminiError(err: unknown): number {
  if (err instanceof StructuredResponseError) return 502;
  if (err instanceof ApiError) {
    if (err.status === 429) return 429;
    if (err.status === 401 || err.status === 403) return 401;
    if (err.status === 400) return 400;
    return 502;
  }
  return 500;
}

export function describeGeminiError(err: unknown): string {
  if (err instanceof ApiError) return `Game Master call failed: ${err.message}`;
  if (err instanceof Error) return err.message;
  return "Unknown error generating the simulation state.";
}
