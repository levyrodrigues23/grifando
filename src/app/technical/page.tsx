import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TechnicalCategory } from "@/generated/prisma/enums";
import { TECHNICAL_CATEGORY_LABELS } from "@/lib/technicalCategoryLabels";
import { getTechnicalPromptsByCategory } from "@/server/domain/writing/technicalPrompts";

export default function TechnicalPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Technical English</h1>
        <p className="text-sm text-muted-foreground">
          Practice writing about the kind of topics developers actually explain — pick a prompt
          to get started.
        </p>
      </div>

      {Object.values(TechnicalCategory).map((category) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle>{TECHNICAL_CATEGORY_LABELS[category] ?? category}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {getTechnicalPromptsByCategory(category).map((prompt) => (
              <Link
                key={prompt.id}
                href={`/write?promptId=${prompt.id}`}
                className="block rounded-md px-2 py-1.5 text-sm hover:bg-muted"
              >
                {prompt.text}
              </Link>
            ))}
          </CardContent>
        </Card>
      ))}
    </main>
  );
}
