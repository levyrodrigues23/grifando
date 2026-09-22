import type { GeneratedExercise } from "@/server/ai/schemas/exerciseGeneration";

export type PublicExercise =
  | { type: "MULTIPLE_CHOICE"; instruction: string; options: string[] }
  | { type: "FILL_BLANK"; instruction: string; template: string }
  | { type: "REWRITE"; instruction: string; original: string }
  | { type: "TRANSLATION"; instruction: string; sourceText: string };

// Strips the answer/explanation from a generated exercise before it's sent
// to the client — active recall requires the answer never be revealed
// before an attempt (SPEC.md §5.4/"Active recall").
export function toPublicExercise(exercise: GeneratedExercise): PublicExercise {
  switch (exercise.type) {
    case "MULTIPLE_CHOICE":
      return { type: exercise.type, instruction: exercise.instruction, options: exercise.options };
    case "FILL_BLANK":
      return { type: exercise.type, instruction: exercise.instruction, template: exercise.template };
    case "REWRITE":
      return { type: exercise.type, instruction: exercise.instruction, original: exercise.original };
    case "TRANSLATION":
      return {
        type: exercise.type,
        instruction: exercise.instruction,
        sourceText: exercise.sourceText,
      };
  }
}
