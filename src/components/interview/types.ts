// Shapes as they arrive over the wire (JSON), matching the /api/interview routes.

export type InterviewAnalysisDTO = {
  correctedText: string;
  naturalText: string;
  overallFeedback: string;
  grammarScore: number;
  vocabularyScore: number;
  clarityScore: number;
  naturalnessScore: number;
  technicalCommunicationScore: number | null;
};

export type InterviewTurnRef = { id: string; question: string; order: number };

export type StartInterviewResponse = {
  sessionId: string;
  turn: InterviewTurnRef;
};

export type AnswerTurnResponse =
  | { status: "failed"; message: string; sessionId: string }
  | { status: "answered"; analysis: InterviewAnalysisDTO; nextTurn: InterviewTurnRef }
  | { status: "ended"; analysis: InterviewAnalysisDTO };

export type CompletedTurn = {
  question: string;
  answer: string;
  analysis: InterviewAnalysisDTO;
};
