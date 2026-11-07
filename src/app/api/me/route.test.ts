import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ deleteUserData: vi.fn(), rateLimitResponse: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: {} }));
vi.mock("@/server/session/currentUser", () => ({
  getCurrentUserId: vi.fn(async () => "visitor-1"),
  ensureUser: vi.fn(async () => undefined),
}));
vi.mock("@/server/rateLimit", () => ({ rateLimitResponse: mocks.rateLimitResponse }));
vi.mock("@/server/domain/privacy/cleanup", () => ({ deleteUserData: mocks.deleteUserData }));

import { NextResponse } from "next/server";
import { DELETE } from "./route";

const req = () => new Request("http://test/api/me", { method: "DELETE" });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rateLimitResponse.mockResolvedValue(null);
});

describe("DELETE /api/me", () => {
  it("deletes the data, expires the cookie and answers 204", async () => {
    const res = await DELETE(req());
    expect(res.status).toBe(204);
    expect(mocks.deleteUserData).toHaveBeenCalledWith({}, "visitor-1");
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("ig_session=;");
    expect(cookie.toLowerCase()).toContain("max-age=0");
  });
  it("is rate limited", async () => {
    mocks.rateLimitResponse.mockResolvedValue(NextResponse.json({ error: "slow" }, { status: 429 }));
    const res = await DELETE(req());
    expect(res.status).toBe(429);
    expect(mocks.deleteUserData).not.toHaveBeenCalled();
  });
});
