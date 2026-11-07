import { AI_KEY_HEADER, AI_PROVIDER_HEADER } from "@/lib/aiCredentials";
import { getStoredAIKey } from "@/lib/aiKeyStore";

// Thrown before any request is made, so the UI can point the visitor to /settings.
export class MissingAIKeyError extends Error {
  constructor() {
    super("Set up your AI key to get feedback.");
    this.name = "MissingAIKeyError";
  }
}

// fetch for routes that call the AI: attaches the stored key in the two
// headers. The key is never put anywhere else (no URL, no body, no logs).
export async function aiFetch(input: string, init?: RequestInit): Promise<Response> {
  // Same-origin paths only, so the key can never be sent to another host.
  if (!input.startsWith("/") || input.startsWith("//")) {
    throw new Error("aiFetch only accepts same-origin paths like /api/...");
  }
  const credentials = getStoredAIKey();
  if (!credentials) throw new MissingAIKeyError();

  const headers = new Headers(init?.headers);
  headers.set(AI_PROVIDER_HEADER, credentials.provider);
  headers.set(AI_KEY_HEADER, credentials.apiKey);
  return fetch(input, { ...init, headers });
}
