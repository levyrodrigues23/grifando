import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { MistakeOccurrenceDTO } from "@/components/writing/types";
import { MISTAKE_CATEGORY_LABELS } from "@/lib/mistakeCategoryLabels";

function vocabularyHref(mistake: MistakeOccurrenceDTO, sessionId: string): string {
  const params = new URLSearchParams({ term: mistake.correctedSpan, example: mistake.example, sessionId });
  return `/vocabulary?${params.toString()}`;
}

// A marginal note for one numbered mark on the proofed page.
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
    <article
      id={`mistake-${index}`}
      className="grid scroll-mt-8 grid-cols-[2rem_minmax(0,1fr)] gap-x-3 border-t border-border py-6 target:bg-linen"
    >
      <span className="pt-0.5 font-mono text-sm text-violet" aria-label={`Mistake ${index + 1}`}>
        {index + 1}
      </span>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={mistake.severity === "ERROR" ? "destructive" : "secondary"}>
            {mistake.severity === "ERROR" ? "Incorrect" : "Unnatural"}
          </Badge>
          <Badge variant="outline">
            {MISTAKE_CATEGORY_LABELS[mistake.category] ?? mistake.category}
          </Badge>
          {mistake.l1Transfer ? <Badge variant="outline">From Portuguese</Badge> : null}
        </div>
        <p className="prose-serif text-xl leading-snug">
          <span className="text-muted-foreground line-through decoration-1">
            {mistake.originalSpan}
          </span>{" "}
          <span aria-hidden="true">→</span> <span className="sr-only">corrected to</span>
          <span>{mistake.correctedSpan}</span>
        </p>
        <p className="text-iron">{mistake.explanation}</p>
        <p className="prose-serif text-iron italic">&ldquo;{mistake.example}&rdquo;</p>
        <Link href={vocabularyHref(mistake, sessionId)} className="inline-block text-sm underline">
          Save to vocabulary
        </Link>
      </div>
    </article>
  );
}
