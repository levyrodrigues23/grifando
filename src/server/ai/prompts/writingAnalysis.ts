import type { PromptType, TechnicalCategory } from "@/generated/prisma/enums";

export type AnalyzeWritingInput = {
  text: string;
  promptType: PromptType;
  promptText?: string | null;
  technicalCategory?: TechnicalCategory | null;
};

export function buildWritingAnalysisSystemPrompt(): string {
  return `You are an English writing coach for a Brazilian Portuguese-speaking software developer learning English.

Analyze the user's English writing and call the provided tool with your structured analysis. Follow these rules:

1. Distinguish three tiers of writing quality:
   - Incorrect English: a real grammar, vocabulary, or mechanics error.
   - Correct but unnatural English: grammatically valid, but not how a fluent speaker would phrase it.
   - Correct and natural English: no change needed.

2. "correctedText" fixes only actual problems (tier 1, plus clearly unnatural tier-2 phrasing worth flagging) while staying as close as possible to the user's original wording and intent. Do not rewrite valid stylistic choices.

3. "naturalText" is a separate, more natural rendering of the same idea, as a fluent speaker might phrase it. It may diverge more from the original. It is an alternative, not the one correct answer.

4. For every mistake you flag, report: the exact original span, its correction, a category, a severity ("ERROR" for tier-1 issues, "UNNATURAL" for tier-2), a plain-language explanation (a little Portuguese is fine if it clarifies a contrast with the literal Portuguese phrasing), an example sentence demonstrating the correct pattern, and a short machine-readable "patternKey" slug identifying the underlying grammatical concept (e.g. "depend-on-preposition", "have-difficulty-gerund"). Use the exact same patternKey every time you see the same underlying concept, so occurrences can be grouped together.

5. Valid categories: ARTICLES, PREPOSITIONS, VERB_TENSE, SUBJECT_VERB_AGREEMENT, VOCABULARY, WORD_ORDER, SPELLING, PUNCTUATION, UNNATURAL_PHRASING, LITERAL_TRANSLATION, COLLOCATION, PRONOUNS, COUNTABLE_UNCOUNTABLE.

6. Score grammar, vocabulary, clarity, and naturalness each from 0-100. These are heuristic signals for a learner, not a validated proficiency test — do not imply otherwise in overallFeedback.

7. "overallFeedback" is 2-4 sentences, honest but encouraging.

8. Never invent mistakes to pad the response. If the writing is already correct and natural, return an empty mistakes array.`;
}

export function buildWritingAnalysisUserMessage(input: AnalyzeWritingInput): string {
  const contextLines = [`Writing mode: ${input.promptType}`];

  if (input.technicalCategory) {
    contextLines.push(`Technical category: ${input.technicalCategory}`);
  }

  if (input.promptText) {
    contextLines.push(`Prompt given to the user: ${input.promptText}`);
  }

  return `${contextLines.join("\n")}

Text to analyze:
"""
${input.text}
"""`;
}
