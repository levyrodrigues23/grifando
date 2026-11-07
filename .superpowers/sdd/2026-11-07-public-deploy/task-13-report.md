# Task 13 Step 1 report
Added scripts/vercel-build.mjs, "vercel-build" script, docs/deploy.md (PT).
Verified: Vercel docs say Next.js uses the `build` script (vercel-build not documented) -> guide sets Build Command override `pnpm vercel-build`.
Neon integration injects DATABASE_URL (pooled) and DATABASE_URL_UNPOOLED (direct); script uses the unpooled one for migrate deploy when present.
pnpm check: pass (294 tests).
