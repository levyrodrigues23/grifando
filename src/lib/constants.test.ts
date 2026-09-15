import { describe, expect, it } from "vitest";

import { DEFAULT_USER_ID } from "@/lib/constants";

describe("constants", () => {
  it("exposes a stable default user id", () => {
    expect(DEFAULT_USER_ID).toBe("default-user");
  });
});
