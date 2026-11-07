import type { PrismaClient } from "@/generated/prisma/client";
import type { AIProvider } from "@/server/ai/provider";
import { NotFoundError } from "@/server/domain/errors";
import { createInterviewRepository } from "@/server/domain/interview/interview.repository";
import { createWritingCoachService } from "@/server/domain/writing/writingCoachService";
import type { WritingSessionWithAnalysis } from "@/server/domain/writing/writingSession.repository";

const MAX_TURNS = 6;

type AnalysisSummary = NonNullable<NonNullable<WritingSessionWithAnalysis>["analysis"]>;
type NextTurn = { id: string; question: string; order: number };

export type AnswerTurnResult =
  | { status: "failed"; message: string; sessionId: string }
  | { status: "answered"; analysis: AnalysisSummary; nextTurn: NextTurn }
  | { status: "ended"; analysis: AnalysisSummary };

export function createInterviewService(deps: {
  prisma: PrismaClient;
  aiProvider: AIProvider;
  modelId: string;
}) {
  const { prisma, aiProvider, modelId } = deps;
  const interviews = createInterviewRepository(prisma);
  const writingCoach = createWritingCoachService({ prisma, aiProvider, modelId });

  return {
    // Opens a session and asks the first question — same continueInterview
    // capability used for every follow-up, just with empty history.
    async startInterview(userId: string) {
      const session = await interviews.createSession(userId);
      const { question } = await aiProvider.continueInterview([]);
      const turn = await interviews.createTurn({
        interviewSessionId: session.id,
        question,
        order: 0,
      });

      return { sessionId: session.id, turn };
    },

    async getSession(sessionId: string, userId: string) {
      return interviews.findSessionById(sessionId, userId);
    },

    // Answering a turn reuses the Writing Coach pipeline exactly (SPEC.md
    // §5.8: the answer is scored the same way any other writing is), then
    // asks a follow-up grounded in the full conversation so far.
    async answerTurn(input: {
      userId: string;
      sessionId: string;
      turnId: string;
      answer: string;
      // Writing session of a previous failed attempt at this answer (see
      // SubmitWritingInput.retrySessionId).
      retrySessionId?: string;
    }): Promise<AnswerTurnResult> {
      const session = await interviews.findSessionById(input.sessionId, input.userId);
      if (!session) {
        throw new NotFoundError("Interview session");
      }

      const turn = session.turns.find((t) => t.id === input.turnId);
      if (!turn) {
        throw new NotFoundError("Interview turn");
      }

      const writingResult = await writingCoach.submitWriting({
        userId: input.userId,
        promptType: "INTERVIEW",
        promptText: turn.question,
        originalText: input.answer,
        retrySessionId: input.retrySessionId,
      });

      if (writingResult.status === "failed") {
        return { status: "failed", message: writingResult.message, sessionId: writingResult.sessionId };
      }

      const analysis = writingResult.session.analysis!;

      await interviews.answerTurn(input.turnId, {
        userAnswer: input.answer,
        writingAnalysisId: analysis.id,
      });

      if (turn.order + 1 >= MAX_TURNS) {
        await interviews.endSession(input.sessionId, input.userId);
        return { status: "ended", analysis };
      }

      const history = [
        ...session.turns
          .filter((t) => t.userAnswer)
          .map((t) => ({ question: t.question, answer: t.userAnswer! })),
        { question: turn.question, answer: input.answer },
      ];

      const { question: nextQuestion } = await aiProvider.continueInterview(history);
      const nextTurn = await interviews.createTurn({
        interviewSessionId: input.sessionId,
        question: nextQuestion,
        order: turn.order + 1,
      });

      return {
        status: "answered",
        analysis,
        nextTurn: { id: nextTurn.id, question: nextTurn.question, order: nextTurn.order },
      };
    },

    async endInterview(sessionId: string, userId: string) {
      return interviews.endSession(sessionId, userId);
    },
  };
}

export type InterviewService = ReturnType<typeof createInterviewService>;
