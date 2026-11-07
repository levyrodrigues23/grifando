import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ cleanupIdleData: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: {} }));
vi.mock("@/server/domain/privacy/cleanup", () => ({ cleanupIdleData: mocks.cleanupIdleData }));

import { GET } from "./route";

function get(authorization?: string) {
  return new Request("http://test/api/cron/cleanup", {
    headers: authorization ? { authorization } : {},
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("CRON_SECRET", "s3cret");
  mocks.cleanupIdleData.mockResolvedValue({ users: 2, windows: 5 });
});

describe("GET /api/cron/cleanup", () => {
  it("401s without a bearer", async () => {
    expect((await GET(get())).status).toBe(401);
    expect(mocks.cleanupIdleData).not.toHaveBeenCalled();
  });
  it("401s with a wrong bearer", async () => {
    expect((await GET(get("Bearer nope"))).status).toBe(401);
    expect((await GET(get("Bearer s3cret-longer"))).status).toBe(401);
    expect(mocks.cleanupIdleData).not.toHaveBeenCalled();
  });
  it("fails closed when CRON_SECRET is unset", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await GET(get("Bearer "))).status).toBe(401);
    expect((await GET(get("Bearer undefined"))).status).toBe(401);
  });
  it("returns counts with the right bearer", async () => {
    const res = await GET(get("Bearer s3cret"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ users: 2, windows: 5 });
  });
});
