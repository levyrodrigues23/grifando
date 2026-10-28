// Shapes as they arrive over the wire (JSON), matching the API routes.

export type PublicExerciseDTO =
  | { type: "MULTIPLE_CHOICE"; instruction: string; options: string[] }
  | { type: "FILL_BLANK"; instruction: string; template: string }
  | { type: "REWRITE"; instruction: string; original: string }
  | { type: "TRANSLATION"; instruction: string; sourceText: string };

export type ExerciseListItemDTO = {
  id: string;
  type: string;
  prompt: PublicExerciseDTO;
};

export type FullExerciseDTO =
  | {
      type: "MULTIPLE_CHOICE";
      instruction: string;
      explanation: string;
      options: string[];
      correctOptionIndex: number;
    }
  | {
      type: "FILL_BLANK";
      instruction: string;
      explanation: string;
      template: string;
      acceptableAnswers: string[];
    }
  | {
      type: "REWRITE";
      instruction: string;
      explanation: string;
      original: string;
      acceptableAnswers: string[];
    }
  | {
      type: "TRANSLATION";
      instruction: string;
      explanation: string;
      sourceText: string;
      acceptableAnswers: string[];
    };

export type SubmitAttemptResponse = {
  attemptId: string;
  isCorrect: boolean;
  explanation: string;
  exercise: FullExerciseDTO;
};
