// Creates the integration-test database (if missing) and applies every migration
// to it. Integration tests TRUNCATE all tables, so this refuses to run when
// TEST_DATABASE_URL points at the same database as DATABASE_URL.
//
// Run via `pnpm db:test:prepare` (needs Postgres up: `docker compose up -d`).
import "dotenv/config";

import { spawnSync } from "node:child_process";

import { Client } from "pg";

function requireUrl(name: string): URL {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set (see .env.example).`);
  }
  return new URL(value);
}

function databaseName(url: URL): string {
  return decodeURIComponent(url.pathname.replace(/^\//, ""));
}

async function main() {
  const testUrl = requireUrl("TEST_DATABASE_URL");
  const testDb = databaseName(testUrl);

  const devUrl = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
  if (devUrl && devUrl.host === testUrl.host && databaseName(devUrl) === testDb) {
    throw new Error(
      `TEST_DATABASE_URL and DATABASE_URL both point at "${testDb}". Tests wipe their database — use a separate one.`,
    );
  }

  // CREATE DATABASE can't run inside the target database, so connect to the
  // server's maintenance database instead.
  const adminUrl = new URL(testUrl);
  adminUrl.pathname = "/postgres";
  adminUrl.search = "";
  const admin = new Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  try {
    const { rowCount } = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [testDb]);
    if (rowCount === 0) {
      await admin.query(`CREATE DATABASE ${admin.escapeIdentifier(testDb)}`);
      console.log(`Created database "${testDb}".`);
    }
  } finally {
    await admin.end();
  }

  // Fixed command string: `shell` is needed to resolve `prisma(.cmd)` from the
  // pnpm script PATH on Windows, and passing args separately with it is deprecated.
  const result = spawnSync("prisma migrate deploy", {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, DATABASE_URL: testUrl.toString() },
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
