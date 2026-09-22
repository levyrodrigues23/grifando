import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { SubmitAttemptResponse } from "@/components/exercises/types";

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

export function ExerciseResult({
  result,
  onNext,
  hasNext,
}: {
  result: SubmitAttemptResponse;
  onNext: () => void;
  hasNext: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Badge variant={result.isCorrect ? "secondary" : "destructive"}>
            {result.isCorrect ? "Correct" : "Not quite"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {!result.isCorrect && (
          <p className="text-sm">
            Expected: <span className="font-medium">{correctAnswerText(result.exercise)}</span>
          </p>
        )}
        <p className="text-sm text-muted-foreground">{result.explanation}</p>
      </CardContent>
      <CardFooter>
        <Button onClick={onNext}>{hasNext ? "Next exercise" : "Done for now"}</Button>
      </CardFooter>
    </Card>
  );
}
