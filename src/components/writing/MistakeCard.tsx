import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { MistakeOccurrenceDTO } from "@/components/writing/types";
import { MISTAKE_CATEGORY_LABELS } from "@/lib/mistakeCategoryLabels";

export function MistakeCard({ mistake, index }: { mistake: MistakeOccurrenceDTO; index: number }) {
  return (
    <Card id={`mistake-${index}`} size="sm" className="scroll-mt-6">
      <CardContent className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={mistake.severity === "ERROR" ? "destructive" : "secondary"}>
            {mistake.severity === "ERROR" ? "Incorrect" : "Unnatural"}
          </Badge>
          <Badge variant="outline">
            {MISTAKE_CATEGORY_LABELS[mistake.category] ?? mistake.category}
          </Badge>
        </div>
        <p className="text-sm">
          <span className="text-destructive line-through">{mistake.originalSpan}</span>
          {" → "}
          <span className="font-medium text-success">
            {mistake.correctedSpan}
          </span>
        </p>
        <p className="text-sm text-muted-foreground">{mistake.explanation}</p>
        <p className="text-sm italic">&ldquo;{mistake.example}&rdquo;</p>
      </CardContent>
    </Card>
  );
}
