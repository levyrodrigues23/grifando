import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { MistakeOccurrenceDTO } from "@/components/writing/types";
import { MISTAKE_CATEGORY_LABELS } from "@/lib/mistakeCategoryLabels";

function vocabularyHref(mistake: MistakeOccurrenceDTO, sessionId: string): string {
  const params = new URLSearchParams({ term: mistake.correctedSpan, example: mistake.example, sessionId });
  return `/vocabulary?${params.toString()}`;
}

export function MistakeCard({
  mistake,
  index,
  sessionId,
}: {
  mistake: MistakeOccurrenceDTO;
  index: number;
  sessionId: string;
}) {
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
          {mistake.l1Transfer ? <Badge variant="outline">From Portuguese</Badge> : null}
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
        <Link href={vocabularyHref(mistake, sessionId)} className="text-xs underline">
          Save to vocabulary
        </Link>
      </CardContent>
    </Card>
  );
}
