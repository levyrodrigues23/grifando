import { NextResponse } from "next/server";

import { isAIAccessError, type AIErrorCode } from "@/server/ai/errors";

const STATUS_BY_CODE: Record<AIErrorCode, number> = {
  AI_KEY_REQUIRED: 401,
  AI_KEY_REJECTED: 401,
  AI_KEY_INVALID: 400,
  AI_QUOTA_EXCEEDED: 429,
  AI_UNAVAILABLE: 503,
};

export function aiErrorResponse(error: unknown): NextResponse | null {
  if (!isAIAccessError(error)) return null;
  return NextResponse.json(
    { error: error.message, code: error.code },
    { status: STATUS_BY_CODE[error.code] },
  );
}
