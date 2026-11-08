import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";

import type { AICredentials, AIProviderName } from "@/server/ai/credentials";
import { AIKeyRejectedError, InvalidAICredentialsError } from "@/server/ai/errors";
import type { AIProvider } from "@/server/ai/provider";
import { createAnthropicProvider, testKey as testAnthropicKey } from "@/server/ai/providers/anthropic";
import { createGeminiProvider, testKey as testGeminiKey } from "@/server/ai/providers/gemini";
import { withResilience } from "@/server/ai/resilient";

const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-5";
// gemini-3.8-flash measured ~88s per analysis (Nov 2026), past AI_TIMEOUT_MS; 3.5 Flash answers in ~5s.
const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";

export const AI_TIMEOUT_MS = 60_000;
export const KEY_TEST_TIMEOUT_MS = 15_000;
export const ANTHROPIC_FALLBACK_MODEL = "claude-haiku-5-5";
// Lightest current Flash text model; no 3.8 Flash-Lite exists (Google model docs).
export const GEMINI_FALLBACK_MODEL = "gemini-3.5-flash-lite";

function primaryModelFor(provider: AIProviderName): string {
  return provider === "gemini"
    ? (process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL)
    : (process.env.ANTHROPIC_MODEL ?? DEFAULT_ANTHROPIC_MODEL);
}

// Built per request from the visitor's own key — never cached across requests.
export function createAIProvider(credentials: AICredentials): { provider: AIProvider; modelId: string } {
  const options = { timeoutMs: AI_TIMEOUT_MS };
  const modelId = primaryModelFor(credentials.provider);
  if (credentials.provider === "gemini") {
    const client = new GoogleGenAI({ apiKey: credentials.apiKey });
    const primary = createGeminiProvider(client, modelId);
    const fallback = createGeminiProvider(client, GEMINI_FALLBACK_MODEL);
    return { provider: withResilience(primary, fallback, options), modelId };
  }
  const client = new Anthropic({ apiKey: credentials.apiKey });
  const primary = createAnthropicProvider(client, modelId);
  const fallback = createAnthropicProvider(client, ANTHROPIC_FALLBACK_MODEL);
  return { provider: withResilience(primary, fallback, options), modelId };
}

export type KeyTestStatus = "works" | "invalid" | "busy";

// One tiny real call with the visitor's key against the model the app uses.
// Rejected/malformed keys read as "invalid"; quota, overload, timeouts and
// anything unexpected read as "busy" (the key may still be fine).
export async function testAIKey(credentials: AICredentials): Promise<KeyTestStatus> {
  // A key is valid or not regardless of model: test on the light fallback so a
  // slow primary model never makes a working key read as "busy".
  const model = credentials.provider === "gemini" ? GEMINI_FALLBACK_MODEL : ANTHROPIC_FALLBACK_MODEL;
  const call =
    credentials.provider === "gemini"
      ? testGeminiKey(new GoogleGenAI({ apiKey: credentials.apiKey }), model)
      : testAnthropicKey(new Anthropic({ apiKey: credentials.apiKey }), model);

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<"timeout">((resolve) => {
    timer = setTimeout(() => resolve("timeout"), KEY_TEST_TIMEOUT_MS);
  });
  try {
    const outcome = await Promise.race([call.then(() => "ok" as const), timedOut]);
    return outcome === "ok" ? "works" : "busy";
  } catch (error) {
    if (error instanceof AIKeyRejectedError || error instanceof InvalidAICredentialsError) return "invalid";
    return "busy";
  } finally {
    clearTimeout(timer);
  }
}
