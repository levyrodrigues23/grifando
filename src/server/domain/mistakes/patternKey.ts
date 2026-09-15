const MAX_PATTERN_KEY_LENGTH = 64;
const FALLBACK_PATTERN_KEY = "unspecified";

// Normalizes the AI-proposed pattern key so occurrences of the same mistake
// collapse into one MistakePattern row instead of near-duplicates (SPEC.md §6).
export function normalizePatternKey(rawKey: string): string {
  const slug = rawKey
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_PATTERN_KEY_LENGTH)
    .replace(/-+$/g, "");

  return slug.length > 0 ? slug : FALLBACK_PATTERN_KEY;
}
