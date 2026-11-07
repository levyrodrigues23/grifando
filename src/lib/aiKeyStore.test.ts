import { afterEach, describe, expect, it, vi } from "vitest";

import { MissingAIKeyError, aiFetch } from "@/lib/aiFetch";
import { clearAIKey, getStoredAIKey, saveAIKey } from "@/lib/aiKeyStore";

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, String(value)),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("aiKeyStore", () => {
  it("saves a trimmed key and reads it back", () => {
    const storage = memoryStorage();
    saveAIKey({ provider: "gemini", apiKey: " k \n" }, storage);
    expect(getStoredAIKey(storage)).toEqual({ provider: "gemini", apiKey: "k" });
  });

  it("returns null for corrupt stored JSON", () => {
    const storage = memoryStorage();
    storage.setItem("inglesando:ai-key", "{not json");
    expect(getStoredAIKey(storage)).toBeNull();
  });

  it("returns null for a stored value with an unknown provider or empty key", () => {
    const storage = memoryStorage();
    storage.setItem("inglesando:ai-key", JSON.stringify({ provider: "openai", apiKey: "k" }));
    expect(getStoredAIKey(storage)).toBeNull();
    storage.setItem("inglesando:ai-key", JSON.stringify({ provider: "gemini", apiKey: "" }));
    expect(getStoredAIKey(storage)).toBeNull();
  });

  it("clears the stored key", () => {
    const storage = memoryStorage();
    saveAIKey({ provider: "anthropic", apiKey: "k" }, storage);
    clearAIKey(storage);
    expect(getStoredAIKey(storage)).toBeNull();
  });

  it("returns null when storage throws (blocked site data)", () => {
    const storage = memoryStorage();
    storage.getItem = () => {
      throw new Error("SecurityError");
    };
    expect(getStoredAIKey(storage)).toBeNull();
  });

  it("returns null outside the browser", () => {
    expect(getStoredAIKey()).toBeNull();
  });
});

describe("aiFetch", () => {
  it("refuses absolute and protocol-relative URLs without calling fetch", async () => {
    const storage = memoryStorage();
    saveAIKey({ provider: "gemini", apiKey: "secret-key" }, storage);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", { localStorage: storage });

    await expect(aiFetch("https://evil.example/api")).rejects.toThrow(/same-origin/);
    await expect(aiFetch("//evil.example/api")).rejects.toThrow(/same-origin/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("saveAIKey reports false when storage throws", () => {
    const blocked = { setItem: () => { throw new Error("blocked"); } } as unknown as Storage;
    expect(saveAIKey({ provider: "gemini", apiKey: "k" }, blocked)).toBe(false);
    expect(saveAIKey({ provider: "gemini", apiKey: "k" }, memoryStorage())).toBe(true);
  });

  it("rejects with MissingAIKeyError and never calls fetch when no key is stored", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", { localStorage: memoryStorage() });

    await expect(aiFetch("/api/writing-sessions", { method: "POST" })).rejects.toBeInstanceOf(
      MissingAIKeyError,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the provider and key headers, keeping the caller's headers", async () => {
    const storage = memoryStorage();
    saveAIKey({ provider: "gemini", apiKey: "secret-key" }, storage);
    const fetchMock = vi.fn(async () => new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", { localStorage: storage });

    await aiFetch("/api/writing-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/writing-sessions");
    const headers = new Headers(init.headers);
    expect(headers.get("x-ai-provider")).toBe("gemini");
    expect(headers.get("x-ai-key")).toBe("secret-key");
    expect(headers.get("content-type")).toBe("application/json");
    expect(init.method).toBe("POST");
  });
});
