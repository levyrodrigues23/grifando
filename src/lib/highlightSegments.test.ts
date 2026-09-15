import { describe, expect, it } from "vitest";

import { buildHighlightSegments } from "@/lib/highlightSegments";

describe("buildHighlightSegments", () => {
  it("splits the text around a single matched span", () => {
    const segments = buildHighlightSegments("I have difficulty to understand concurrency.", [
      { originalSpan: "difficulty to understand" },
    ]);

    expect(segments).toEqual([
      { text: "I have ", mistakeIndex: null },
      { text: "difficulty to understand", mistakeIndex: 0 },
      { text: " concurrency.", mistakeIndex: null },
    ]);
  });

  it("handles multiple non-overlapping matches in order", () => {
    const segments = buildHighlightSegments("I depend of it and it depend of me.", [
      { originalSpan: "it and it depend of me" },
      { originalSpan: "depend of" },
    ]);

    expect(segments[0]).toEqual({ text: "I ", mistakeIndex: null });
    expect(segments[1].mistakeIndex).toBe(1);
    expect(segments.some((s) => s.mistakeIndex === 0)).toBe(true);
  });

  it("skips a span the model didn't quote verbatim instead of throwing", () => {
    const segments = buildHighlightSegments("Some text here.", [{ originalSpan: "not in the text" }]);
    expect(segments).toEqual([{ text: "Some text here.", mistakeIndex: null }]);
  });

  it("skips a later match that overlaps an already-placed one", () => {
    const segments = buildHighlightSegments("I depend of this.", [
      { originalSpan: "depend of this" },
      { originalSpan: "of this" },
    ]);

    expect(segments).toEqual([
      { text: "I ", mistakeIndex: null },
      { text: "depend of this", mistakeIndex: 0 },
      { text: ".", mistakeIndex: null },
    ]);
  });

  it("returns the whole text unhighlighted when there are no mistakes", () => {
    const segments = buildHighlightSegments("All correct.", []);
    expect(segments).toEqual([{ text: "All correct.", mistakeIndex: null }]);
  });
});
