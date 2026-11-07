// Vercel build entry: apply database migrations on production deploys, then build the app.
// Migrations use the direct (non-pooled) connection when the Neon integration provides one.
import { spawn } from "node:child_process";

function run(args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn("pnpm", args, { stdio: "inherit", env, shell: process.platform === "win32" });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`pnpm ${args.join(" ")} exited with code ${code}`)),
    );
  });
}

try {
  if (process.env.VERCEL_ENV === "production") {
    const direct = process.env.DATABASE_URL_UNPOOLED;
    await run(
      ["prisma", "migrate", "deploy"],
      direct ? { ...process.env, DATABASE_URL: direct } : process.env,
    );
  }
  await run(["next", "build"]);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Build failed");
  process.exit(1);
}
