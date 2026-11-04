// Message to show for a failed fetch. Rate-limit responses (429) carry a
// user-facing explanation worth showing as is; any other failure keeps the
// caller's generic message, since 500 bodies are not written for users.
export async function errorMessageFor(response: Response, fallback: string): Promise<string> {
  if (response.status !== 429) return fallback;
  const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
  return typeof body?.error === "string" ? body.error : fallback;
}
