import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { MistakeOccurrenceDTO } from "@/components/writing/types";

const CATEGORY_LABELS: Record<string, string> = {
  ARTICLES: "Articles",
  PREPOSITIONS: "Prepositions",
  VERB_TENSE: "Verb tense",
  SUBJECT_VERB_AGREEMENT: "Subject-verb agreement",
  VOCABULARY: "Vocabulary",
  WORD_ORDER: "Word order",
  SPELLING: "Spelling",
  PUNCTUATION: "Punctuation",
  UNNATURAL_PHRASING: "Unnatural phrasing",
  LITERAL_TRANSLATION: "Literal translation",
  COLLOCATION: "Collocation",
  PRONOUNS: "Pronouns",
  COUNTABLE_UNCOUNTABLE: "Countable/uncountable",
};

export function MistakeCard({ mistake, index }: { mistake: MistakeOccurrenceDTO; index: number }) {
  return (
    <Card id={`mistake-${index}`} size="sm" className="scroll-mt-6">
      <CardContent className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={mistake.severity === "ERROR" ? "destructive" : "secondary"}>
            {mistake.severity === "ERROR" ? "Incorrect" : "Unnatural"}
          </Badge>
          <Badge variant="outline">{CATEGORY_LABELS[mistake.category] ?? mistake.category}</Badge>
        </div>
        <p className="text-sm">
          <span className="text-destructive line-through">{mistake.originalSpan}</span>
          {" → "}
          <span className="font-medium text-emerald-600 dark:text-emerald-400">
            {mistake.correctedSpan}
          </span>
        </p>
        <p className="text-sm text-muted-foreground">{mistake.explanation}</p>
        <p className="text-sm italic">&ldquo;{mistake.example}&rdquo;</p>
      </CardContent>
    </Card>
  );
}
