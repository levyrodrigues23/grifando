// Shared by the browser (aiFetch, key store) and the server (credentials.ts),
// so it must stay free of server-only imports.
export type AIProviderName = "gemini" | "anthropic";
export type AICredentials = { provider: AIProviderName; apiKey: string };

export const AI_PROVIDER_HEADER = "x-ai-provider";
export const AI_KEY_HEADER = "x-ai-key";

export function isProviderName(value: unknown): value is AIProviderName {
  return value === "gemini" || value === "anthropic";
}
