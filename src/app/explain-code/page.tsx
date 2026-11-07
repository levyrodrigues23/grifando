import { PageHeader, PageShell } from "@/components/layout/PageHeader";
import { ExplainCodeCoach } from "@/components/writing/ExplainCodeCoach";

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
