import { describe, expect, it } from "vitest";

import { MistakeCategory } from "@/generated/prisma/enums";
import {
  DAILY_PROMPTS,
  extractActiveWeakCategories,
  selectDailyPrompt,
} from "@/server/domain/writing/dailyPrompt";

const promptA = { id: "a", text: "A", focusCategories: [MistakeCategory.ARTICLES] };
const promptB = { id: "b", text: "B", focusCategories: [MistakeCategory.VERB_TENSE] };
const promptC = { id: "c", text: "C", focusCategories: [] };

describe("selectDailyPrompt", () => {
  it("returns the same prompt for the same calendar day", () => {
    const date = new Date("2026-03-05T08:00:00Z");
    const first = selectDailyPrompt(DAILY_PROMPTS, date);
    const second = selectDailyPrompt(DAILY_PROMPTS, new Date("2026-03-05T20:00:00Z"));
    expect(first.id).toBe(second.id);
  });

  it("can return a different prompt on a different day", () => {
    const results = new Set(
      Array.from({ length: 30 }, (_, day) =>
        selectDailyPrompt(DAILY_PROMPTS, new Date(2026, 0, day + 1)).id,
      ),
    );
    expect(results.size).toBeGreaterThan(1);
  });

  it("only picks from prompts tagged with a weak category, when any match", () => {
    const date = new Date("2026-03-05T00:00:00Z");
    const result = selectDailyPrompt([promptA, promptB, promptC], date, [MistakeCategory.ARTICLES]);
    expect(result.id).toBe("a");
  });

  it("falls back to the full bank when no prompt matches the weak categories", () => {
    const date = new Date("2026-03-05T00:00:00Z");
    const result = selectDailyPrompt([promptA, promptB], date, [MistakeCategory.SPELLING]);
    expect(["a", "b"]).toContain(result.id);
  });

  it("uses the full bank when no weak categories are given", () => {
    const date = new Date("2026-03-05T00:00:00Z");
    const result = selectDailyPrompt([promptA, promptB, promptC], date);
    expect(["a", "b", "c"]).toContain(result.id);
  });
});

describe("extractActiveWeakCategories", () => {
  it("includes ACTIVE and IMPROVING categories", () => {
    const result = extractActiveWeakCategories([
      { category: MistakeCategory.ARTICLES, masteryLevel: "ACTIVE" },
      { category: MistakeCategory.VERB_TENSE, masteryLevel: "IMPROVING" },
    ]);
    expect(result).toContain(MistakeCategory.ARTICLES);
    expect(result).toContain(MistakeCategory.VERB_TENSE);
  });

  it("excludes MASTERED categories", () => {
    const result = extractActiveWeakCategories([
      { category: MistakeCategory.ARTICLES, masteryLevel: "MASTERED" },
    ]);
    expect(result).toEqual([]);
  });

  it("deduplicates repeated categories", () => {
    const result = extractActiveWeakCategories([
      { category: MistakeCategory.ARTICLES, masteryLevel: "ACTIVE" },
      { category: MistakeCategory.ARTICLES, masteryLevel: "IMPROVING" },
    ]);
    expect(result).toEqual([MistakeCategory.ARTICLES]);
  });
});
