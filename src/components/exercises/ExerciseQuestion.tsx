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
      <div className="space-y-6">
        <p className="text-subheading">{exercise.instruction}</p>
        <RadioGroup value={answer} onValueChange={(value) => onAnswerChange(String(value))}>
          {exercise.options.map((option, index) => (
            <Label
              key={index}
              className="flex cursor-pointer items-center gap-3 rounded-[4px] bg-card px-4 py-3.5 text-base leading-snug text-foreground ring-1 ring-border hover:ring-stone has-data-checked:bg-linen has-data-checked:ring-foreground"
            >
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
      <div className="space-y-6">
        <p className="text-subheading">{exercise.instruction}</p>
        <p className="prose-serif text-2xl leading-snug">{exercise.template}</p>
        <Input
          value={answer}
          onChange={(event) => onAnswerChange(event.target.value)}
          placeholder="Your answer"
          aria-label="Your answer"
        />
      </div>
    );
  }

  if (exercise.type === "REWRITE") {
    return (
      <div className="space-y-6">
        <p className="text-subheading">{exercise.instruction}</p>
        <p className="prose-serif text-2xl leading-snug">&ldquo;{exercise.original}&rdquo;</p>
        <Textarea
          value={answer}
          onChange={(event) => onAnswerChange(event.target.value)}
          rows={3}
          aria-label="Your rewrite"
          className="prose-serif text-lg"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-subheading">{exercise.instruction}</p>
      <p className="prose-serif text-2xl leading-snug">&ldquo;{exercise.sourceText}&rdquo;</p>
      <Textarea
        value={answer}
        onChange={(event) => onAnswerChange(event.target.value)}
        rows={3}
        aria-label="Your translation"
        className="prose-serif text-lg"
      />
    </div>
  );
}
