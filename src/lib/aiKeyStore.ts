import { isProviderName, type AICredentials } from "@/lib/aiCredentials";

// The visitor's AI key lives only in this browser's localStorage. Every access
// is guarded: storage can be missing (server render) or throw (blocked site data).
// Kept from the project's former name (Inglesando) so keys saved before the rename still work.
const STORAGE_KEY = "inglesando:ai-key";

function browserStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getStoredAIKey(storage: Storage | null = browserStorage()): AICredentials | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as { provider?: unknown; apiKey?: unknown } | null;
    if (!isProviderName(value?.provider) || typeof value.apiKey !== "string") return null;
    const apiKey = value.apiKey.trim();
    return apiKey ? { provider: value.provider, apiKey } : null;
  } catch {
    return null;
  }
}

// Returns false when the browser won't store it (blocked or full storage).
export function saveAIKey(credentials: AICredentials, storage: Storage | null = browserStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ provider: credentials.provider, apiKey: credentials.apiKey.trim() }),
    );
    return true;
  } catch {
    return false;
  }
}

export function clearAIKey(storage: Storage | null = browserStorage()): void {
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}
