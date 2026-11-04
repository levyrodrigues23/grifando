import { createPrismaClient } from "@/server/db/client";

export function getTestDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL is not set — integration tests need a dedicated test database (see .env.example).",
    );
  }
  return url;
}

export function createTestPrismaClient() {
  return createPrismaClient(getTestDatabaseUrl());
}

const TABLES = [
  "CategoryAbility",
  "VocabularyItem",
  "InterviewTurn",
  "InterviewSession",
  "ExerciseAttempt",
  "Exercise",
  "MistakeOccurrence",
  "MistakePattern",
  "WritingAnalysis",
  "WritingSession",
  "User",
];

export async function resetDatabase(prisma: ReturnType<typeof createPrismaClient>) {
  const tableList = TABLES.map((table) => `"${table}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE;`);
}
