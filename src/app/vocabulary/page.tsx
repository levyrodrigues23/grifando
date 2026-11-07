import { PageHeader, PageShell } from "@/components/layout/PageHeader";
import { RemoveVocabularyButton } from "@/components/vocabulary/RemoveVocabularyButton";
import { VocabularyForm } from "@/components/vocabulary/VocabularyForm";
import { prisma } from "@/server/db/client";
import { createVocabularyRepository } from "@/server/domain/vocabulary/vocabulary.repository";
import { getCurrentUserId } from "@/server/session/currentUser";

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function VocabularyPage(props: PageProps<"/vocabulary">) {
  const userId = await getCurrentUserId();
  const searchParams = await props.searchParams;
  const items = await createVocabularyRepository(prisma).listByUser(userId);
  const prefillTerm = firstParam(searchParams.term);

  return (
    <PageShell>
      <PageHeader
        title="Vocabulary"
        description="Words and expressions worth keeping, with what they mean in Portuguese and a sentence that uses them."
      />

      <div className="grid gap-x-16 gap-y-12 lg:grid-cols-[minmax(0,1fr)_400px]">
        <section aria-labelledby="saved-title">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 id="saved-title" className="text-heading">
              Saved
            </h2>
            <span className="label-mono text-muted-foreground">
              {items.length} {items.length === 1 ? "entry" : "entries"}
            </span>
          </div>
          {items.length === 0 ? (
            <p className="prose-serif text-lg text-iron">
              Nothing saved yet. Use &ldquo;Save to vocabulary&rdquo; on a mistake, or add a word
              here.
            </p>
          ) : (
            <ul className="border-t border-border">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-4 border-b border-border py-5"
                >
                  <div className="min-w-0 space-y-1.5">
                    <p className="text-subheading">{item.term}</p>
                    <p className="text-muted-foreground">{item.meaningPt}</p>
                    <p className="prose-serif text-iron italic">
                      &ldquo;{item.exampleSentence}&rdquo;
                    </p>
                  </div>
                  <RemoveVocabularyButton id={item.id} term={item.term} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="add-title" className="lg:order-first lg:col-start-2">
          <h2 id="add-title" className="text-heading mb-6">
            Add a word
          </h2>
          {/* Prefilled from a mistake card's "Save to vocabulary" link; keyed so a new
              prefill resets the form. */}
          <VocabularyForm
            key={prefillTerm ?? ""}
            initialTerm={prefillTerm}
            initialExample={firstParam(searchParams.example)}
            sourceSessionId={firstParam(searchParams.sessionId)}
          />
        </section>
      </div>
    </PageShell>
  );
}
