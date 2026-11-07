import { PageHeader, PageShell } from "@/components/layout/PageHeader";
import { InterviewPractice } from "@/components/interview/InterviewPractice";

export default function InterviewPage() {
  return (
    <PageShell>
      <PageHeader
        title="Interview"
        description="A mock technical interview: answer each question in English and get feedback on how you said it."
      />
      <InterviewPractice />
    </PageShell>
  );
}
