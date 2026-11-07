import type { Metadata } from "next";
import { PageHeader, PageShell } from "@/components/layout/PageHeader";
import { ExplainCodeCoach } from "@/components/writing/ExplainCodeCoach";

export const metadata: Metadata = {
  title: "Explain code",
  description: "Paste a code snippet and explain it in English, then get feedback on your wording.",
};

export default function ExplainCodePage() {
  return (
    <PageShell>
      <PageHeader
        title="Explain code"
        description="Paste a small snippet and explain what it does in English — the way you would in a code review."
      />
      <ExplainCodeCoach />
    </PageShell>
  );
}
