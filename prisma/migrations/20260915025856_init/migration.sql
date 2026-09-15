-- CreateEnum
CREATE TYPE "PromptType" AS ENUM ('FREE', 'DAILY_CHALLENGE', 'TECHNICAL', 'EXPLAIN_CODE', 'INTERVIEW');

-- CreateEnum
CREATE TYPE "TechnicalCategory" AS ENUM ('BACKEND', 'FRONTEND', 'DEVOPS', 'DATABASES', 'CLOUD', 'ARCHITECTURE', 'ALGORITHMS', 'TESTING', 'GIT', 'GITHUB', 'CODE_REVIEW', 'SECURITY', 'AI', 'SYSTEM_DESIGN');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('PENDING', 'ANALYZED', 'FAILED');

-- CreateEnum
CREATE TYPE "MistakeCategory" AS ENUM ('ARTICLES', 'PREPOSITIONS', 'VERB_TENSE', 'SUBJECT_VERB_AGREEMENT', 'VOCABULARY', 'WORD_ORDER', 'SPELLING', 'PUNCTUATION', 'UNNATURAL_PHRASING', 'LITERAL_TRANSLATION', 'COLLOCATION', 'PRONOUNS', 'COUNTABLE_UNCOUNTABLE');

-- CreateEnum
CREATE TYPE "MistakeSeverity" AS ENUM ('ERROR', 'UNNATURAL');

-- CreateEnum
CREATE TYPE "MasteryLevel" AS ENUM ('ACTIVE', 'IMPROVING', 'MASTERED');

-- CreateEnum
CREATE TYPE "ExerciseType" AS ENUM ('MULTIPLE_CHOICE', 'FILL_BLANK', 'REWRITE', 'TRANSLATION');

-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('ACTIVE', 'ENDED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "nativeLanguage" TEXT NOT NULL DEFAULT 'pt-BR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WritingSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "promptType" "PromptType" NOT NULL,
    "promptText" TEXT,
    "technicalCategory" "TechnicalCategory",
    "originalText" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WritingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WritingAnalysis" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "correctedText" TEXT NOT NULL,
    "naturalText" TEXT NOT NULL,
    "overallFeedback" TEXT NOT NULL,
    "grammarScore" INTEGER NOT NULL,
    "vocabularyScore" INTEGER NOT NULL,
    "clarityScore" INTEGER NOT NULL,
    "naturalnessScore" INTEGER NOT NULL,
    "modelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WritingAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MistakeOccurrence" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "patternId" TEXT NOT NULL,
    "originalSpan" TEXT NOT NULL,
    "correctedSpan" TEXT NOT NULL,
    "category" "MistakeCategory" NOT NULL,
    "severity" "MistakeSeverity" NOT NULL,
    "explanation" TEXT NOT NULL,
    "example" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MistakeOccurrence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MistakePattern" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "MistakeCategory" NOT NULL,
    "patternKey" TEXT NOT NULL,
    "exampleOriginal" TEXT NOT NULL,
    "exampleCorrection" TEXT NOT NULL,
    "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
    "masteryLevel" "MasteryLevel" NOT NULL DEFAULT 'ACTIVE',
    "consecutiveCorrectCount" INTEGER NOT NULL DEFAULT 0,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MistakePattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ExerciseType" NOT NULL,
    "sourcePatternId" TEXT,
    "promptData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseAttempt" (
    "id" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "userAnswer" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "feedback" TEXT NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExerciseAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "InterviewStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewTurn" (
    "id" TEXT NOT NULL,
    "interviewSessionId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "userAnswer" TEXT,
    "writingAnalysisId" TEXT,
    "order" INTEGER NOT NULL,

    CONSTRAINT "InterviewTurn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabularyItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "meaningPt" TEXT NOT NULL,
    "exampleSentence" TEXT NOT NULL,
    "sourceSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VocabularyItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "WritingSession_userId_createdAt_idx" ON "WritingSession"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WritingAnalysis_sessionId_key" ON "WritingAnalysis"("sessionId");

-- CreateIndex
CREATE INDEX "MistakeOccurrence_analysisId_idx" ON "MistakeOccurrence"("analysisId");

-- CreateIndex
CREATE INDEX "MistakeOccurrence_patternId_idx" ON "MistakeOccurrence"("patternId");

-- CreateIndex
CREATE INDEX "MistakePattern_userId_masteryLevel_idx" ON "MistakePattern"("userId", "masteryLevel");

-- CreateIndex
CREATE UNIQUE INDEX "MistakePattern_userId_category_patternKey_key" ON "MistakePattern"("userId", "category", "patternKey");

-- CreateIndex
CREATE INDEX "Exercise_userId_createdAt_idx" ON "Exercise"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ExerciseAttempt_exerciseId_idx" ON "ExerciseAttempt"("exerciseId");

-- CreateIndex
CREATE INDEX "InterviewSession_userId_createdAt_idx" ON "InterviewSession"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewTurn_writingAnalysisId_key" ON "InterviewTurn"("writingAnalysisId");

-- CreateIndex
CREATE INDEX "InterviewTurn_interviewSessionId_order_idx" ON "InterviewTurn"("interviewSessionId", "order");

-- CreateIndex
CREATE INDEX "VocabularyItem_userId_idx" ON "VocabularyItem"("userId");

-- AddForeignKey
ALTER TABLE "WritingSession" ADD CONSTRAINT "WritingSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WritingAnalysis" ADD CONSTRAINT "WritingAnalysis_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WritingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MistakeOccurrence" ADD CONSTRAINT "MistakeOccurrence_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "WritingAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MistakeOccurrence" ADD CONSTRAINT "MistakeOccurrence_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "MistakePattern"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MistakePattern" ADD CONSTRAINT "MistakePattern_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_sourcePatternId_fkey" FOREIGN KEY ("sourcePatternId") REFERENCES "MistakePattern"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseAttempt" ADD CONSTRAINT "ExerciseAttempt_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewTurn" ADD CONSTRAINT "InterviewTurn_interviewSessionId_fkey" FOREIGN KEY ("interviewSessionId") REFERENCES "InterviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewTurn" ADD CONSTRAINT "InterviewTurn_writingAnalysisId_fkey" FOREIGN KEY ("writingAnalysisId") REFERENCES "WritingAnalysis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyItem" ADD CONSTRAINT "VocabularyItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyItem" ADD CONSTRAINT "VocabularyItem_sourceSessionId_fkey" FOREIGN KEY ("sourceSessionId") REFERENCES "WritingSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
