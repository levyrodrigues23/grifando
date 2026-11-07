import { describe, expect, it } from "vitest";

import { newSessionId, signSessionId, verifySessionToken } from "./sessionToken";

const SECRET = "test-secret-xxxxxxxxxxxxxxxxxxxxxxxxxxxx";

describe("sessionToken", () => {
  it("round-trips a signed id", () => {
    expect(verifySessionToken(signSessionId("abc", SECRET), SECRET)).toBe("abc");
  });

  it("rejects a tampered id, a wrong secret, and junk", () => {
    const token = signSessionId("abc", SECRET);
    expect(verifySessionToken(token.replace("abc", "abd"), SECRET)).toBeNull();
    expect(verifySessionToken(token, "other-secret-xxxxxxxxxxxxxxxxxxxxxxxx")).toBeNull();
    for (const junk of [undefined, "", "abc", ".sig", "a.b.c"]) {
      expect(verifySessionToken(junk, SECRET)).toBeNull();
    }
  });

  it("mints distinct ids", () => {
    expect(newSessionId()).not.toBe(newSessionId());
  });
});
