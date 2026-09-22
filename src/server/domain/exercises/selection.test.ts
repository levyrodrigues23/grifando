import { describe, expect, it } from "vitest";

import { MasteryLevel } from "@/generated/prisma/enums";
import { selectPatternsForPractice } from "@/server/domain/exercises/selection";

function pattern(id: string, occurrenceCount: number, masteryLevel: MasteryLevel) {
  return { id, occurrenceCount, masteryLevel };
}

describe("selectPatternsForPractice", () => {
  it("prioritizes ACTIVE patterns over IMPROVING and MASTERED", () => {
    const patterns = [
      pattern("mastered", 10, MasteryLevel.MASTERED),
      pattern("improving", 10, MasteryLevel.IMPROVING),
      pattern("active", 1, MasteryLevel.ACTIVE),
    ];

    const result = selectPatternsForPractice(patterns, 3);
    expect(result.map((p) => p.id)).toEqual(["active", "improving", "mastered"]);
  });

  it("breaks ties within the same mastery level by occurrence count, most frequent first", () => {
    const patterns = [
      pattern("rare", 1, MasteryLevel.ACTIVE),
      pattern("frequent", 5, MasteryLevel.ACTIVE),
    ];

    const result = selectPatternsForPractice(patterns, 2);
    expect(result.map((p) => p.id)).toEqual(["frequent", "rare"]);
  });

  it("caps the result at the requested count", () => {
    const patterns = [
      pattern("a", 1, MasteryLevel.ACTIVE),
      pattern("b", 2, MasteryLevel.ACTIVE),
      pattern("c", 3, MasteryLevel.ACTIVE),
    ];

    expect(selectPatternsForPractice(patterns, 2)).toHaveLength(2);
  });

  it("does not mutate the input array", () => {
    const patterns = [pattern("a", 1, MasteryLevel.ACTIVE), pattern("b", 2, MasteryLevel.ACTIVE)];
    const original = [...patterns];

    selectPatternsForPractice(patterns, 2);

    expect(patterns).toEqual(original);
  });

  it("returns an empty array when there are no patterns", () => {
    expect(selectPatternsForPractice([], 5)).toEqual([]);
  });
});
