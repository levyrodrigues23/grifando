import { NextResponse } from "next/server";

import { aiErrorResponse } from "@/server/ai/aiErrorResponse";
import { testAIKey } from "@/server/ai/client";
import { readAICredentials } from "@/server/ai/credentials";
import { AIKeyRequiredError } from "@/server/ai/errors";
import { prisma } from "@/server/db/client";
import { rateLimitResponse } from "@/server/rateLimit";
import { ensureUser, getCurrentUserId } from "@/server/session/currentUser";

// Checks the visitor's key from the request headers only (never the dev env
// keys) and answers { status: "works" | "invalid" | "busy" }. No key headers at
// all is a client bug, answered like every AI route: 401 AI_KEY_REQUIRED.
// The key is never logged.
export async function POST(request: Request) {
  const userId = await getCurrentUserId();

  let credentials;
  try {
    credentials = readAICredentials(request.headers);
  } catch {
    return NextResponse.json({ status: "invalid" });
  }
  if (!credentials) return aiErrorResponse(new AIKeyRequiredError())!;

  await ensureUser(prisma, userId);
  const limited = await rateLimitResponse(prisma, request, userId, "keyTest");
  if (limited) return limited;

  return NextResponse.json({ status: await testAIKey(credentials) });
}
