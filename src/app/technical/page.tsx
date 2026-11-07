import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader, PageShell } from "@/components/layout/PageHeader";
import { TechnicalCategory } from "@/generated/prisma/enums";
import { TECHNICAL_CATEGORY_LABELS } from "@/lib/technicalCategoryLabels";
import { getTechnicalPromptsByCategory } from "@/server/domain/writing/technicalPrompts";

export const metadata: Metadata = {
  title: "Technical English",
  description: "Writing prompts about the topics developers actually explain.",
};

export default function TechnicalPage() {
  return (
    <PageShell>
      <PageHeader
        title="Technical English"
        description="Practice writing about the topics developers actually explain. Pick a prompt to start."
      />
      <div className="space-y-16">
        {Object.values(TechnicalCategory).map((category) => (
          <section
            key={category}
            className="grid gap-x-16 gap-y-4 lg:grid-cols-[280px_minmax(0,1fr)]"
          >
            <h2 className="text-heading-sm">{TECHNICAL_CATEGORY_LABELS[category] ?? category}</h2>
            <ul className="border-t border-border">
              {getTechnicalPromptsByCategory(category).map((prompt) => (
                <li key={prompt.id} className="border-b border-border">
                  <Link
                    href={`/write?promptId=${prompt.id}`}
                    className="group flex items-baseline justify-between gap-6 py-4 hover:bg-card"
                  >
                    <span className="prose-serif text-lg">{prompt.text}</span>
                    <span
                      aria-hidden="true"
                      className="shrink-0 text-sm text-muted-foreground group-hover:text-foreground"
                    >
                      Write →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
