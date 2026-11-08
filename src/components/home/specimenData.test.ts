import { describe, expect, it } from "vitest";

import { buildHighlightSegments } from "@/lib/highlightSegments";

import { SPECIMEN_SCENARIOS } from "./specimenData";

describe("live specimen data", () => {
  it("has three scenarios with unique ids", () => {
    expect(SPECIMEN_SCENARIOS).toHaveLength(3);
    expect(new Set(SPECIMEN_SCENARIOS.map((scenario) => scenario.id)).size).toBe(3);
  });

  for (const scenario of SPECIMEN_SCENARIOS) {
    describe(scenario.label, () => {
      it("has three marks", () => {
        expect(scenario.mistakes).toHaveLength(3);
      });

      it("quotes every mistake span verbatim in the paragraph", () => {
        for (const mistake of scenario.mistakes) {
          expect(scenario.text).toContain(mistake.originalSpan);
        }
      });

      it("lets the highlighter mark every mistake, in order", () => {
        const marked = buildHighlightSegments(scenario.text, scenario.mistakes)
          .filter((segment) => segment.mistakeIndex !== null)
          .map((segment) => segment.mistakeIndex);
        expect(marked).toEqual(scenario.mistakes.map((_, index) => index));
      });
    });
  }
});
