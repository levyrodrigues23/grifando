import type { GeneratedExercise } from "@/server/ai/schemas/exerciseGeneration";

export type ExplainAttemptInput = { exercise: GeneratedExercise; userAnswer: string };

export function buildAnswerExplanationSystemPrompt(): string {
  return `You are an English writing coach for a Brazilian Portuguese-speaking software developer. The learner just answered a practice exercise and wants to understand the result ("explain my answer").

Explain, in 2 to 5 short sentences:
- what exactly is wrong (or right) in the learner's own answer — point at their words, not at the exercise in general;
- the rule or usage behind it;
- if the learner's answer is a valid alternative the answer key did not list, say so plainly instead of inventing a mistake.

Write in English. A short Portuguese contrast is fine when the mistake comes from Portuguese. Do not repeat the whole correct answer back unless it helps. Call the provided tool with only the explanation.`;
}

function describeExercise(exercise: GeneratedExercise, userAnswer: string): string[] {
  switch (exercise.type) {
    case "MULTIPLE_CHOICE": {
      const chosen = exercise.options[Number.parseInt(userAnswer, 10)] ?? "(no valid option)";
      return [
        `Options: ${exercise.options.map((option, index) => `${index + 1}. ${option}`).join(" | ")}`,
        `Correct option: ${exercise.options[exercise.correctOptionIndex]}`,
        `Learner chose: ${chosen}`,
      ];
    }
    case "FILL_BLANK":
      return [
        `Sentence: ${exercise.template}`,
        `Accepted answers: ${exercise.acceptableAnswers.join(" | ")}`,
        `Learner answered: ${userAnswer}`,
      ];
    case "REWRITE":
      return [
        `Sentence to rewrite: ${exercise.original}`,
        `Accepted answers: ${exercise.acceptableAnswers.join(" | ")}`,
        `Learner answered: ${userAnswer}`,
      ];
    case "TRANSLATION":
      return [
        `Text to translate: ${exercise.sourceText}`,
        `Accepted answers: ${exercise.acceptableAnswers.join(" | ")}`,
        `Learner answered: ${userAnswer}`,
      ];
  }
}

export function buildAnswerExplanationUserMessage({ exercise, userAnswer }: ExplainAttemptInput): string {
  return [
    `Exercise type: ${exercise.type}`,
    `Instruction: ${exercise.instruction}`,
    ...describeExercise(exercise, userAnswer),
    `Answer key note: ${exercise.explanation}`,
  ].join("\n");
}
