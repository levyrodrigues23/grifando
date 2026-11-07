// Message to show for a failed fetch. Rate-limit responses (429) and AI key
// problems (coded AI_*) carry a user-facing explanation worth showing as is;
// any other failure keeps the caller's generic message, since 500 bodies are
// not written for users.
const SHOWN_STATUSES = new Set([400, 401, 429, 503]);

export async function errorMessageFor(response: Response, fallback: string): Promise<string> {
  if (!SHOWN_STATUSES.has(response.status)) return fallback;
  const body = (await response.json().catch(() => null)) as { error?: unknown; code?: unknown } | null;
  if (typeof body?.error !== "string") return fallback;
  if (response.status === 429) return body.error;
  return typeof body.code === "string" && body.code.startsWith("AI_") ? body.error : fallback;
}
