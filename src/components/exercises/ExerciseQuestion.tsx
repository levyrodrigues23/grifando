import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type { PublicExerciseDTO } from "@/components/exercises/types";

export function ExerciseQuestion({
  exercise,
  answer,
  onAnswerChange,
}: {
  exercise: PublicExerciseDTO;
  answer: string;
  onAnswerChange: (value: string) => void;
}) {
  if (exercise.type === "MULTIPLE_CHOICE") {
    return (
      <div className="space-y-3">
        <p className="text-sm">{exercise.instruction}</p>
        <RadioGroup value={answer} onValueChange={(value) => onAnswerChange(String(value))}>
          {exercise.options.map((option, index) => (
            <Label key={index} className="flex items-center gap-2 text-sm font-normal">
              <RadioGroupItem value={String(index)} />
              {option}
            </Label>
          ))}
        </RadioGroup>
      </div>
    );
  }

  if (exercise.type === "FILL_BLANK") {
    return (
      <div className="space-y-3">
        <p className="text-sm">{exercise.instruction}</p>
        <p className="text-sm text-muted-foreground">{exercise.template}</p>
        <Input
          value={answer}
          onChange={(event) => onAnswerChange(event.target.value)}
          placeholder="Your answer"
        />
      </div>
    );
  }

  if (exercise.type === "REWRITE") {
    return (
      <div className="space-y-3">
        <p className="text-sm">{exercise.instruction}</p>
        <p className="text-sm text-muted-foreground italic">&ldquo;{exercise.original}&rdquo;</p>
        <Textarea value={answer} onChange={(event) => onAnswerChange(event.target.value)} rows={3} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm">{exercise.instruction}</p>
      <p className="text-sm text-muted-foreground italic">&ldquo;{exercise.sourceText}&rdquo;</p>
      <Textarea value={answer} onChange={(event) => onAnswerChange(event.target.value)} rows={3} />
    </div>
  );
}
