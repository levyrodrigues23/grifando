import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { prisma } from "@/server/db/client";
import { cleanupIdleData } from "@/server/domain/privacy/cleanup";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed: no secret configured, nobody gets in
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// Vercel Cron calls this daily with `Authorization: Bearer $CRON_SECRET`.
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await cleanupIdleData(prisma, new Date()));
}
