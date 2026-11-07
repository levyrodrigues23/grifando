import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";

import type { AICredentials } from "@/server/ai/credentials";
import type { AIProvider } from "@/server/ai/provider";
import { createAnthropicProvider } from "@/server/ai/providers/anthropic";
import { createGeminiProvider } from "@/server/ai/providers/gemini";
import { withResilience } from "@/server/ai/resilient";

const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-5";
const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";

export const AI_TIMEOUT_MS = 60_000;
export const ANTHROPIC_FALLBACK_MODEL = "claude-haiku-5-5";
// Lightest current Flash text model; no 3.8 Flash-Lite exists (Google model docs).
export const GEMINI_FALLBACK_MODEL = "gemini-3.5-flash-lite";

// Built per request from the visitor's own key — never cached across requests.
export function createAIProvider(credentials: AICredentials): { provider: AIProvider; modelId: string } {
  const options = { timeoutMs: AI_TIMEOUT_MS };
  if (credentials.provider === "gemini") {
    const modelId = process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;
    const client = new GoogleGenAI({ apiKey: credentials.apiKey });
    const primary = createGeminiProvider(client, modelId);
    const fallback = createGeminiProvider(client, GEMINI_FALLBACK_MODEL);
    return { provider: withResilience(primary, fallback, options), modelId };
  }
  const modelId = process.env.ANTHROPIC_MODEL ?? DEFAULT_ANTHROPIC_MODEL;
  const client = new Anthropic({ apiKey: credentials.apiKey });
  const primary = createAnthropicProvider(client, modelId);
  const fallback = createAnthropicProvider(client, ANTHROPIC_FALLBACK_MODEL);
  return { provider: withResilience(primary, fallback, options), modelId };
}
