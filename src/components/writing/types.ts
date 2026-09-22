// Shapes as they arrive over the wire (JSON — Dates are strings), not the
// server's Prisma-typed rows. Keep in sync with the API route's response.

export type MistakeOccurrenceDTO = {
  id: string;
  originalSpan: string;
  correctedSpan: string;
  category: string;
  severity: "ERROR" | "UNNATURAL";
  explanation: string;
  example: string;
};

export type WritingAnalysisDTO = {
  correctedText: string;
  naturalText: string;
  overallFeedback: string;
  grammarScore: number;
  vocabularyScore: number;
  clarityScore: number;
  naturalnessScore: number;
  technicalCommunicationScore: number | null;
  occurrences: MistakeOccurrenceDTO[];
};

export type WritingSessionDTO = {
  id: string;
  originalText: string;
  status: "PENDING" | "ANALYZED" | "FAILED";
  analysis: WritingAnalysisDTO | null;
};

export type SubmitWritingResponse =
  | { status: "analyzed"; session: WritingSessionDTO }
  | { status: "failed"; sessionId: string; message: string };
