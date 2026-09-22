import { describe, expect, it } from "vitest";

import { TechnicalCategory } from "@/generated/prisma/enums";
import {
  TECHNICAL_PROMPTS,
  findTechnicalPromptById,
  getTechnicalPromptsByCategory,
} from "@/server/domain/writing/technicalPrompts";

describe("TECHNICAL_PROMPTS", () => {
  it("has at least one prompt for every technical category", () => {
    for (const category of Object.values(TechnicalCategory)) {
      const prompts = getTechnicalPromptsByCategory(category);
      expect(prompts.length).toBeGreaterThan(0);
    }
  });

  it("has unique ids across the whole bank", () => {
    const ids = TECHNICAL_PROMPTS.map((prompt) => prompt.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("getTechnicalPromptsByCategory", () => {
  it("only returns prompts from the requested category", () => {
    const prompts = getTechnicalPromptsByCategory(TechnicalCategory.GIT);
    expect(prompts.every((prompt) => prompt.category === TechnicalCategory.GIT)).toBe(true);
  });
});

describe("findTechnicalPromptById", () => {
  it("finds a prompt by id", () => {
    const prompt = findTechnicalPromptById("backend-1");
    expect(prompt?.category).toBe(TechnicalCategory.BACKEND);
  });

  it("returns undefined for an unknown id", () => {
    expect(findTechnicalPromptById("does-not-exist")).toBeUndefined();
  });
});
