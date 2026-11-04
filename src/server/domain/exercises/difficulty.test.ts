import { describe, expect, it } from "vitest";

import {
  DEFAULT_ABILITY,
  expectedSuccess,
  levelToRating,
  MAX_LEVEL,
  MIN_LEVEL,
  targetLevel,
  updateAbility,
} from "@/server/domain/exercises/difficulty";

describe("expectedSuccess", () => {
  it("is 50% when ability matches difficulty and rises as ability exceeds it", () => {
    expect(expectedSuccess(1000, 1000)).toBeCloseTo(0.5);
    expect(expectedSuccess(1200, 1000)).toBeGreaterThan(0.7);
    expect(expectedSuccess(800, 1000)).toBeLessThan(0.3);
  });
});

describe("updateAbility", () => {
  it("rises on success and falls on failure", () => {
    expect(updateAbility(DEFAULT_ABILITY, 3, true)).toBeGreaterThan(DEFAULT_ABILITY);
    expect(updateAbility(DEFAULT_ABILITY, 3, false)).toBeLessThan(DEFAULT_ABILITY);
  });

  it("moves more on a surprising result than on an expected one", () => {
    const passHard = updateAbility(DEFAULT_ABILITY, MAX_LEVEL, true) - DEFAULT_ABILITY;
    const passEasy = updateAbility(DEFAULT_ABILITY, MIN_LEVEL, true) - DEFAULT_ABILITY;
    expect(passHard).toBeGreaterThan(passEasy);

    const failEasy = DEFAULT_ABILITY - updateAbility(DEFAULT_ABILITY, MIN_LEVEL, false);
    const failHard = DEFAULT_ABILITY - updateAbility(DEFAULT_ABILITY, MAX_LEVEL, false);
    expect(failEasy).toBeGreaterThan(failHard);
  });
});

describe("targetLevel", () => {
  it("aims at about 70% expected success", () => {
    for (const ability of [900, 1000, 1100]) {
      const level = targetLevel(ability);
      expect(expectedSuccess(ability, levelToRating(level))).toBeGreaterThan(0.55);
      expect(expectedSuccess(ability, levelToRating(level))).toBeLessThan(0.85);
    }
  });

  it("gets harder as ability grows and stays within 1-5", () => {
    expect(targetLevel(1300)).toBeGreaterThan(targetLevel(1000));
    expect(targetLevel(100)).toBe(MIN_LEVEL);
    expect(targetLevel(5000)).toBe(MAX_LEVEL);
  });
});
