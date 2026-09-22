import { describe, expect, it } from "vitest";

import {
  evaluateExerciseAnswer,
  isMultipleChoiceCorrect,
  isTextAnswerAcceptable,
} from "@/server/domain/exercises/answerChecking";

describe("isMultipleChoiceCorrect", () => {
  it("matches the exact correct index", () => {
    expect(isMultipleChoiceCorrect(1, 1)).toBe(true);
  });

  it("rejects a different index", () => {
    expect(isMultipleChoiceCorrect(0, 1)).toBe(false);
  });
});

describe("isTextAnswerAcceptable", () => {
  it("matches an exact acceptable answer", () => {
    expect(isTextAnswerAcceptable("understanding", ["understanding"])).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isTextAnswerAcceptable("Understanding", ["understanding"])).toBe(true);
  });

  it("ignores leading/trailing whitespace and trailing punctuation", () => {
    expect(
      isTextAnswerAcceptable("  I depend on this library.  ", ["I depend on this library"]),
    ).toBe(true);
  });

  it("matches any of several acceptable answers", () => {
    expect(isTextAnswerAcceptable("b", ["a", "b", "c"])).toBe(true);
  });

  it("rejects an answer that matches none of the acceptable answers", () => {
    expect(isTextAnswerAcceptable("wrong", ["right"])).toBe(false);
  });
});

describe("evaluateExerciseAnswer", () => {
  it("dispatches multiple choice by numeric index", () => {
    const exercise = {
      type: "MULTIPLE_CHOICE" as const,
      instruction: "x",
      explanation: "x",
      options: ["a", "b"],
      correctOptionIndex: 1,
    };
    expect(evaluateExerciseAnswer(exercise, "1")).toBe(true);
    expect(evaluateExerciseAnswer(exercise, "0")).toBe(false);
  });

  it("dispatches fill-blank by text match", () => {
    const exercise = {
      type: "FILL_BLANK" as const,
      instruction: "x",
      explanation: "x",
      template: "x ______ y",
      acceptableAnswers: ["understanding"],
    };
    expect(evaluateExerciseAnswer(exercise, "understanding")).toBe(true);
    expect(evaluateExerciseAnswer(exercise, "understand")).toBe(false);
  });
});
