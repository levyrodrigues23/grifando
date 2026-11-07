import {
  AI_KEY_HEADER,
  AI_PROVIDER_HEADER,
  isProviderName,
  type AICredentials,
  type AIProviderName,
} from "@/lib/aiCredentials";
import { InvalidAICredentialsError } from "@/server/ai/errors";

export { AI_KEY_HEADER, AI_PROVIDER_HEADER, type AICredentials, type AIProviderName };

const MAX_KEY_LENGTH = 256;
const PRINTABLE_ASCII = /^[\x21-\x7e]+$/;

export function readAICredentials(headers: Headers): AICredentials | null {
  const provider = headers.get(AI_PROVIDER_HEADER)?.trim();
  const apiKey = headers.get(AI_KEY_HEADER)?.trim();
  if (!provider || !apiKey) return null;

  if (!isProviderName(provider) || apiKey.length > MAX_KEY_LENGTH || !PRINTABLE_ASCII.test(apiKey)) {
    throw new InvalidAICredentialsError();
  }
  return { provider, apiKey };
}

// Env keys are a local-development convenience only; production never uses them.
export function resolveAICredentials(headers: Headers): AICredentials | null {
  const fromHeaders = readAICredentials(headers);
  if (fromHeaders) return fromHeaders;
  if (process.env.NODE_ENV === "production") return null;

  const provider: AIProviderName = process.env.AI_PROVIDER === "gemini" ? "gemini" : "anthropic";
  const apiKey = (provider === "gemini" ? process.env.GEMINI_API_KEY : process.env.ANTHROPIC_API_KEY)?.trim();
  return apiKey ? { provider, apiKey } : null;
}
