-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "difficulty" INTEGER;

-- CreateTable
CREATE TABLE "CategoryAbility" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "MistakeCategory" NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryAbility_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CategoryAbility_userId_category_key" ON "CategoryAbility"("userId", "category");

-- AddForeignKey
ALTER TABLE "CategoryAbility" ADD CONSTRAINT "CategoryAbility_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
