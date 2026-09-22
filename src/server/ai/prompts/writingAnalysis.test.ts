import { describe, expect, it } from "vitest";

import { PromptType, TechnicalCategory } from "@/generated/prisma/enums";
import {
  buildWritingAnalysisUserMessage,
  buildWritingAnalysisSystemPrompt,
} from "@/server/ai/prompts/writingAnalysis";

describe("buildWritingAnalysisUserMessage", () => {
  it("includes the writing text verbatim", () => {
    const message = buildWritingAnalysisUserMessage({
      text: "I depend of this library.",
      promptType: PromptType.FREE,
    });
    expect(message).toContain("I depend of this library.");
  });

  it("includes the technical category when present", () => {
    const message = buildWritingAnalysisUserMessage({
      text: "some text",
      promptType: PromptType.TECHNICAL,
      technicalCategory: TechnicalCategory.BACKEND,
    });
    expect(message).toContain("BACKEND");
  });

  it("omits the technical category line when absent", () => {
    const message = buildWritingAnalysisUserMessage({
      text: "some text",
      promptType: PromptType.FREE,
    });
    expect(message).not.toContain("Technical category");
  });

  it("includes the prompt text when present", () => {
    const message = buildWritingAnalysisUserMessage({
      text: "some text",
      promptType: PromptType.DAILY_CHALLENGE,
      promptText: "Explain what Docker is.",
    });
    expect(message).toContain("Explain what Docker is.");
  });

  it("includes the code snippet when present", () => {
    const message = buildWritingAnalysisUserMessage({
      text: "This function checks whether the user already exists.",
      promptType: PromptType.EXPLAIN_CODE,
      codeSnippet: "export async function registerUser() {}",
    });
    expect(message).toContain("export async function registerUser() {}");
  });

  it("omits the code snippet line when absent", () => {
    const message = buildWritingAnalysisUserMessage({
      text: "some text",
      promptType: PromptType.FREE,
    });
    expect(message).not.toContain("Code the user is explaining");
  });
});

describe("buildWritingAnalysisSystemPrompt", () => {
  it("lists every mistake category so the model can't invent new ones", () => {
    const prompt = buildWritingAnalysisSystemPrompt();
    for (const category of [
      "ARTICLES",
      "PREPOSITIONS",
      "VERB_TENSE",
      "SUBJECT_VERB_AGREEMENT",
      "VOCABULARY",
      "WORD_ORDER",
      "SPELLING",
      "PUNCTUATION",
      "UNNATURAL_PHRASING",
      "LITERAL_TRANSLATION",
      "COLLOCATION",
      "PRONOUNS",
      "COUNTABLE_UNCOUNTABLE",
    ]) {
      expect(prompt).toContain(category);
    }
  });

  it("instructs the model not to evaluate code correctness for EXPLAIN_CODE", () => {
    const prompt = buildWritingAnalysisSystemPrompt();
    expect(prompt).toContain("EXPLAIN_CODE");
    expect(prompt.toLowerCase()).toContain("never comment on whether the code itself");
  });

  it("instructs the model to score technicalCommunication for INTERVIEW mode", () => {
    const prompt = buildWritingAnalysisSystemPrompt();
    expect(prompt).toContain("INTERVIEW");
    expect(prompt).toContain("technicalCommunication");
  });
});
