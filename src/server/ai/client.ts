import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";

import type { AICredentials } from "@/server/ai/credentials";
import type { AIProvider } from "@/server/ai/provider";
import { createAnthropicProvider } from "@/server/ai/providers/anthropic";
import { createGeminiProvider } from "@/server/ai/providers/gemini";

const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-5";
const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";

// Built per request from the visitor's own key — never cached across requests.
export function createAIProvider(credentials: AICredentials): { provider: AIProvider; modelId: string } {
  if (credentials.provider === "gemini") {
    const modelId = process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;
    const client = new GoogleGenAI({ apiKey: credentials.apiKey });
    return { provider: createGeminiProvider(client, modelId), modelId };
  }
  const modelId = process.env.ANTHROPIC_MODEL ?? DEFAULT_ANTHROPIC_MODEL;
  const client = new Anthropic({ apiKey: credentials.apiKey });
  return { provider: createAnthropicProvider(client, modelId), modelId };
}
