import { Card, CardContent } from "@/components/ui/card";
import { RemoveVocabularyButton } from "@/components/vocabulary/RemoveVocabularyButton";
import { VocabularyForm } from "@/components/vocabulary/VocabularyForm";
import { DEFAULT_USER_ID } from "@/lib/constants";
import { prisma } from "@/server/db/client";
import { createVocabularyRepository } from "@/server/domain/vocabulary/vocabulary.repository";

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function VocabularyPage(props: PageProps<"/vocabulary">) {
  const searchParams = await props.searchParams;
  const items = await createVocabularyRepository(prisma).listByUser(DEFAULT_USER_ID);
  const prefillTerm = firstParam(searchParams.term);

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-medium tracking-normal uppercase">Vocabulary</h1>
        <p className="text-sm text-muted-foreground">
          Words and expressions worth keeping, with what they mean in Portuguese and a sentence that
          uses them.
        </p>
      </div>

      {/* Prefilled from a mistake card's "Save to vocabulary" link; keyed so a new
          prefill resets the form. */}
      <VocabularyForm
        key={prefillTerm ?? ""}
        initialTerm={prefillTerm}
        initialExample={firstParam(searchParams.example)}
        sourceSessionId={firstParam(searchParams.sessionId)}
      />

      <div className="space-y-3">
        {items.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Nothing saved yet. Use &ldquo;Save to vocabulary&rdquo; on a mistake, or add a word above.
            </CardContent>
          </Card>
        ) : (
          items.map((item) => (
            <Card key={item.id} size="sm">
              <CardContent className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="font-medium">{item.term}</p>
                  <p className="text-sm text-muted-foreground">{item.meaningPt}</p>
                  <p className="text-sm italic">&ldquo;{item.exampleSentence}&rdquo;</p>
                </div>
                <RemoveVocabularyButton id={item.id} term={item.term} />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </main>
  );
}
