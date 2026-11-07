import type { Metadata } from "next";
import { PageHeader, PageShell } from "@/components/layout/PageHeader";
import { InterviewPractice } from "@/components/interview/InterviewPractice";

export const metadata: Metadata = {
  title: "Interview",
  description: "A mock technical interview in English with feedback on how you answered.",
};

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
