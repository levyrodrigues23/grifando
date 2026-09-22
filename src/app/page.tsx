import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DEFAULT_USER_ID } from "@/lib/constants";
import { prisma } from "@/server/db/client";
import { createMistakePatternRepository } from "@/server/domain/mistakes/mistakePattern.repository";
import {
  DAILY_PROMPTS,
  extractActiveWeakCategories,
  getTodaysDate,
  selectDailyPrompt,
} from "@/server/domain/writing/dailyPrompt";

// Reads live, per-request data (mistake patterns, today's date) — must never
// be statically prerendered at build time.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const patterns = createMistakePatternRepository(prisma);
  const userPatterns = await patterns.listByUser(DEFAULT_USER_ID);
  const weakCategories = extractActiveWeakCategories(userPatterns);
  const prompt = selectDailyPrompt(DAILY_PROMPTS, getTodaysDate(), weakCategories);

  return (
    <main className="mx-auto flex max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI English Coach</h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Write something in English and get structured feedback built from your own mistakes.
        </p>
      </div>

      <Card className="w-full max-w-md text-left">
        <CardHeader>
          <CardTitle>Today&apos;s challenge</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{prompt.text}</p>
        </CardContent>
        <CardFooter>
          <Button render={<Link href="/write?mode=daily">Write your answer</Link>} />
        </CardFooter>
      </Card>

      <Button variant="outline" render={<Link href="/write">Or write freely instead</Link>} />
    </main>
  );
}
