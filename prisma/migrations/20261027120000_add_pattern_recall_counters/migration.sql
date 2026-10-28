-- AlterTable
ALTER TABLE "MistakePattern" ADD COLUMN     "correctCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "incorrectCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastPracticedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill from existing history: each occurrence in writing is a failed
-- recall; exercise attempts on the pattern add correct/incorrect recalls; the
-- latest of those events is the last practice time.
UPDATE "MistakePattern" AS p
SET "correctCount" = COALESCE(a."correct", 0),
    "incorrectCount" = p."occurrenceCount" + COALESCE(a."incorrect", 0),
    "lastPracticedAt" = GREATEST(p."lastSeenAt", COALESCE(a."lastAttemptAt", p."lastSeenAt"))
FROM "MistakePattern" AS base
LEFT JOIN (
  SELECT e."sourcePatternId" AS "patternId",
         COUNT(*) FILTER (WHERE ea."isCorrect") AS "correct",
         COUNT(*) FILTER (WHERE NOT ea."isCorrect") AS "incorrect",
         MAX(ea."attemptedAt") AS "lastAttemptAt"
  FROM "ExerciseAttempt" AS ea
  JOIN "Exercise" AS e ON e."id" = ea."exerciseId"
  WHERE e."sourcePatternId" IS NOT NULL
  GROUP BY e."sourcePatternId"
) AS a ON a."patternId" = base."id"
WHERE base."id" = p."id";
