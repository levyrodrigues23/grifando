import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { SubmitAttemptResponse } from "@/components/exercises/types";
import { diffWords, findClosestAnswer } from "@/lib/answerDiff";

function correctAnswerText(exercise: SubmitAttemptResponse["exercise"]): string {
  switch (exercise.type) {
    case "MULTIPLE_CHOICE":
      return exercise.options[exercise.correctOptionIndex];
    case "FILL_BLANK":
    case "REWRITE":
    case "TRANSLATION":
      return exercise.acceptableAnswers[0];
  }
}

// Free-text answers: compare against the acceptable answer closest to what the
// user wrote, word by word, instead of always showing the first one.
function AnswerDiff({ userAnswer, acceptableAnswers }: { userAnswer: string; acceptableAnswers: string[] }) {
  const expected = findClosestAnswer(userAnswer, acceptableAnswers);
  if (!expected) return null;

  return (
    <div className="space-y-1 text-sm">
      <p>
        Closest answer: <span className="font-medium">{expected}</span>
      </p>
      <p aria-label="Differences between your answer and the closest answer">
        {diffWords(userAnswer, expected).map((segment, index) => (
          <span key={index}>
            {index > 0 ? " " : null}
            {segment.kind === "removed" ? (
              <del className="text-destructive">{segment.text}</del>
            ) : segment.kind === "added" ? (
              <ins className="text-success no-underline">{segment.text}</ins>
            ) : (
              segment.text
            )}
          </span>
        ))}
      </p>
    </div>
  );
}

export function ExerciseResult({
  result,
  userAnswer,
  onNext,
  hasNext,
}: {
  result: SubmitAttemptResponse;
  userAnswer: string;
  onNext: () => void;
  hasNext: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Badge variant={result.isCorrect ? "success" : "destructive"}>
            {result.isCorrect ? "Correct" : "Not quite"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {!result.isCorrect &&
          (result.exercise.type === "REWRITE" || result.exercise.type === "TRANSLATION" ? (
            <AnswerDiff userAnswer={userAnswer} acceptableAnswers={result.exercise.acceptableAnswers} />
          ) : (
            <p className="text-sm">
              Expected: <span className="font-medium">{correctAnswerText(result.exercise)}</span>
            </p>
          ))}
        <p className="text-sm text-muted-foreground">{result.explanation}</p>
      </CardContent>
      <CardFooter>
        <Button onClick={onNext}>{hasNext ? "Next exercise" : "Done for now"}</Button>
      </CardFooter>
    </Card>
  );
}
