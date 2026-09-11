import Anthropic from "@anthropic-ai/sdk";

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is not set. Add it to .env.local.");
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * "Claude 3.5 Sonnet" was retired (Oct 28, 2025). claude-sonnet-5 is the current-generation
 * successor in the same tier and is used here for all Game Master calls.
 */
export const GAME_MASTER_MODEL = "claude-sonnet-5";

export const GAME_MASTER_MAX_TOKENS = 8192;
