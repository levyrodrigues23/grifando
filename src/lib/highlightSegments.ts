export type HighlightMistake = { originalSpan: string };

export type HighlightSegment = { text: string; mistakeIndex: number | null };

// Locates each mistake's exact original span inside the source text so the UI
// can render inline highlights linked to the mistake cards below (SPEC.md §5.1).
// A span the model didn't quote verbatim, or one overlapping an earlier match,
// is silently skipped — it still shows up in the mistake list, just unhighlighted.
export function buildHighlightSegments(text: string, mistakes: HighlightMistake[]): HighlightSegment[] {
  const matches = mistakes
    .map((mistake, mistakeIndex) => ({ mistakeIndex, start: text.indexOf(mistake.originalSpan) }))
    .filter((match) => match.start !== -1 && mistakes[match.mistakeIndex].originalSpan.length > 0)
    .map((match) => ({
      ...match,
      end: match.start + mistakes[match.mistakeIndex].originalSpan.length,
    }))
    .sort((a, b) => a.start - b.start);

  const segments: HighlightSegment[] = [];
  let cursor = 0;

  for (const match of matches) {
    if (match.start < cursor) continue;
    if (match.start > cursor) {
      segments.push({ text: text.slice(cursor, match.start), mistakeIndex: null });
    }
    segments.push({ text: text.slice(match.start, match.end), mistakeIndex: match.mistakeIndex });
    cursor = match.end;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), mistakeIndex: null });
  }

  return segments;
}
