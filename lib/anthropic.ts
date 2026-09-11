import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

/**
 * Lazily constructs (and caches) the Anthropic client on first use inside a request handler -
 * deliberately NOT at module-evaluation time. Next.js's build step imports every route
 * module to collect its config (runtime, dynamic segment config, etc.), so a top-level
 * `new Anthropic(...)` or an eager "is the key set" throw here would fail the production
 * build itself in any environment where ANTHROPIC_API_KEY isn't set yet - e.g. the first
 * deploy, before environment variables are configured on the host.
 */
export function getAnthropicClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set on the server. Add it to your environment configuration.");
  }
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

/**
 * "Claude 3.5 Sonnet" was retired (Oct 28, 2025). claude-sonnet-5 is the current-generation
 * successor in the same tier and is used here for all Game Master calls.
 */
export const GAME_MASTER_MODEL = "claude-sonnet-5";

export const GAME_MASTER_MAX_TOKENS = 8192;
