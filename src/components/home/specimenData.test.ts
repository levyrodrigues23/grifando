import { describe, expect, it } from "vitest";

import { buildHighlightSegments } from "@/lib/highlightSegments";

import { SPECIMEN_MISTAKES, SPECIMEN_TEXT } from "./specimenData";

describe("live specimen data", () => {
  it("quotes every mistake span verbatim in the paragraph", () => {
    for (const mistake of SPECIMEN_MISTAKES) {
      expect(SPECIMEN_TEXT).toContain(mistake.originalSpan);
    }
  });

  it("lets the highlighter mark every mistake, in order", () => {
    const marked = buildHighlightSegments(SPECIMEN_TEXT, SPECIMEN_MISTAKES)
      .filter((segment) => segment.mistakeIndex !== null)
      .map((segment) => segment.mistakeIndex);
    expect(marked).toEqual(SPECIMEN_MISTAKES.map((_, index) => index));
  });

  it("has three marks", () => {
    expect(SPECIMEN_MISTAKES).toHaveLength(3);
  });
});
