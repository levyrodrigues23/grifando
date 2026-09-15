import { fileURLToPath } from "node:url";

import "dotenv/config";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Integration tests share one real Postgres database; running files in
    // parallel races truncate/seed steps against each other.
    fileParallelism: false,
  },
});
