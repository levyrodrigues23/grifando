import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";

import { createAnthropicProvider } from "@/server/ai/providers/anthropic";
import { createGeminiProvider } from "@/server/ai/providers/gemini";
import type { AIProvider } from "@/server/ai/provider";

const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-5";
const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";

let cachedProvider: AIProvider | undefined;

function getProviderName(): "anthropic" | "gemini" {
  return process.env.AI_PROVIDER === "gemini" ? "gemini" : "anthropic";
}

export function getAIModelId(): string {
  return getProviderName() === "gemini"
    ? (process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL)
    : (process.env.ANTHROPIC_MODEL ?? DEFAULT_ANTHROPIC_MODEL);
}

// Lazy so importing this module never throws when no API key is set (e.g.
// running unrelated tests) — it only throws once the provider is used.
// AI_PROVIDER selects which one; see .env.example.
export function getAIProvider(): AIProvider {
  if (!cachedProvider) {
    const providerName = getProviderName();

    if (providerName === "gemini") {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not set (see .env.example).");
      }
      const client = new GoogleGenAI({ apiKey });
      cachedProvider = createGeminiProvider(client, getAIModelId());
    } else {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error("ANTHROPIC_API_KEY is not set (see .env.example).");
      }
      const client = new Anthropic({ apiKey });
      cachedProvider = createAnthropicProvider(client, getAIModelId());
    }
  }

  return cachedProvider;
}
