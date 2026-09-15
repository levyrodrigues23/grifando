import Anthropic from "@anthropic-ai/sdk";

import { createAnthropicProvider } from "@/server/ai/providers/anthropic";
import type { AIProvider } from "@/server/ai/provider";

const DEFAULT_MODEL = "claude-sonnet-5";

let cachedProvider: AIProvider | undefined;

// Lazy so importing this module never throws when ANTHROPIC_API_KEY is unset
// (e.g. running unrelated tests) — it only throws once the provider is used.
export function getAIProvider(): AIProvider {
  if (!cachedProvider) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set (see .env.example).");
    }

    const client = new Anthropic({ apiKey });
    const model = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;
    cachedProvider = createAnthropicProvider(client, model);
  }

  return cachedProvider;
}
