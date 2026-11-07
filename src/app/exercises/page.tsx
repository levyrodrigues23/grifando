import { PageHeader, PageShell } from "@/components/layout/PageHeader";
import { ExercisePractice } from "@/components/exercises/ExercisePractice";

export default function ExercisesPage() {
  return (
    <PageShell>
      <PageHeader
        title="Exercises"
        description="Built from your own mistakes. Answer before you see the solution — recall is what makes it stick."
      />
      <ExercisePractice />
    </PageShell>
  );
}
