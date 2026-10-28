import { describe, expect, it } from "vitest";

import { estimateHalfLifeDays, recallProbability } from "@/server/domain/mistakes/recall";

const DAY = 24 * 60 * 60 * 1000;
const now = new Date("2026-10-27T12:00:00Z");
const daysAgo = (days: number) => new Date(now.getTime() - days * DAY);

describe("estimateHalfLifeDays", () => {
  it("doubles with each correct recall and shrinks with each failure", () => {
    expect(estimateHalfLifeDays({ correctCount: 0, incorrectCount: 0 })).toBe(1);
    expect(estimateHalfLifeDays({ correctCount: 2, incorrectCount: 0 })).toBe(4);
    expect(estimateHalfLifeDays({ correctCount: 0, incorrectCount: 2 })).toBeCloseTo(0.5);
    expect(estimateHalfLifeDays({ correctCount: 3, incorrectCount: 2 })).toBeCloseTo(4);
  });

  it("is clamped to a sane range", () => {
    expect(estimateHalfLifeDays({ correctCount: 0, incorrectCount: 50 })).toBe(0.25);
    expect(estimateHalfLifeDays({ correctCount: 50, incorrectCount: 0 })).toBe(365);
  });
});

describe("recallProbability", () => {
  it("is 1 right after practice and 0.5 one half-life later", () => {
    const counters = { correctCount: 2, incorrectCount: 0 }; // half-life 4 days
    expect(recallProbability({ ...counters, lastPracticedAt: now }, now)).toBe(1);
    expect(recallProbability({ ...counters, lastPracticedAt: daysAgo(4) }, now)).toBeCloseTo(0.5);
    expect(recallProbability({ ...counters, lastPracticedAt: daysAgo(8) }, now)).toBeCloseTo(0.25);
  });

  it("decays faster for a pattern with more failures", () => {
    const strong = recallProbability({ correctCount: 4, incorrectCount: 1, lastPracticedAt: daysAgo(3) }, now);
    const weak = recallProbability({ correctCount: 0, incorrectCount: 3, lastPracticedAt: daysAgo(3) }, now);
    expect(strong).toBeGreaterThan(weak);
  });

  it("treats a future lastPracticedAt as just practiced", () => {
    expect(recallProbability({ correctCount: 0, incorrectCount: 1, lastPracticedAt: daysAgo(-1) }, now)).toBe(1);
  });
});
