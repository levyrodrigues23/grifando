import { beforeEach, describe, expect, it, vi } from "vitest";

const store = { get: vi.fn() };
vi.mock("next/headers", () => ({ cookies: vi.fn(async () => store) }));

import { MissingSessionError, getCurrentUserId } from "./currentUser";
import { SESSION_COOKIE, getSessionSecret, signSessionId } from "./sessionToken";

beforeEach(() => {
  store.get.mockReset();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("getCurrentUserId", () => {
  it("returns the id from a valid signed cookie", async () => {
    store.get.mockImplementation((name: string) =>
      name === SESSION_COOKIE ? { value: signSessionId("user-1", getSessionSecret()) } : undefined,
    );
    expect(await getCurrentUserId()).toBe("user-1");
  });

  it("throws MissingSessionError for a missing, tampered or wrong-secret cookie", async () => {
    for (const value of [
      undefined,
      signSessionId("user-1", getSessionSecret()).replace("user-1", "user-2"),
      signSessionId("user-1", "some-other-secret-xxxxxxxxxxxxxxxx"),
    ]) {
      store.get.mockReturnValue(value === undefined ? undefined : { value });
      await expect(getCurrentUserId()).rejects.toBeInstanceOf(MissingSessionError);
    }
  });
});
