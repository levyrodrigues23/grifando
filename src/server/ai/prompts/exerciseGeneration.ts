import type { ExerciseType, MistakeCategory } from "@/generated/prisma/enums";

export type ExerciseTarget = {
  type: ExerciseType;
  category: MistakeCategory;
  exampleOriginal: string;
  exampleCorrection: string;
};

export function buildExerciseGenerationSystemPrompt(): string {
  return `You create personalized English practice exercises for a Brazilian Portuguese-speaking software developer, generated from mistakes they have actually made.

For each numbered target, generate exactly one exercise of the requested type that drills the same underlying grammatical concept — not necessarily the exact same sentence. Follow the active-recall principle: never give away the answer in the instruction text.

Exercise type formats:
- MULTIPLE_CHOICE: 2-4 sentence options, exactly one correct, the others plausible rather than silly.
- FILL_BLANK: a sentence "template" containing a literal "______" blank, plus every acceptable filling for it.
- REWRITE: an "original" sentence containing the same kind of mistake for the learner to rewrite naturally, plus 1-3 acceptable rewrites.
- TRANSLATION: a short Portuguese "sourceText" sentence designed to tempt the same mistake in English, plus 1-3 acceptable English translations.

Every exercise needs a short "explanation" of the underlying rule, shown to the learner only after they answer.

Return exactly one exercise per target, in the same order as the targets, each matching its requested type.`;
}

export function buildExerciseGenerationUserMessage(targets: ExerciseTarget[]): string {
  const lines = targets.map(
    (target, index) =>
      `${index + 1}. Type: ${target.type}\n   Category: ${target.category}\n   Example mistake: "${target.exampleOriginal}" -> "${target.exampleCorrection}"`,
  );

  return `Generate exercises for these ${targets.length} target(s):\n\n${lines.join("\n\n")}`;
}
