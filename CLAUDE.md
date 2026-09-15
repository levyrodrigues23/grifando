# CLAUDE.md

Personal AI English Coach. Full product spec: `SPEC.md`. Read it before working on any
feature-level change — this file only covers things a future session needs that aren't
obvious from the code.

## Stack & versions (pinned deliberately — do not "helpfully" bump)

- TypeScript is pinned to `5.9.3`, **not** the TS 7 line. `typescript-eslint` does not support
  TS 7 yet (`>=4.8.4 <6.1.0` peer range). Do not upgrade TypeScript without re-checking that.
- Prisma is pinned to `7.10.0` for both `prisma` and `@prisma/client`. `prisma@latest` on npm
  currently resolves to an `8.0.0-rc` — do not install `latest`, pin explicitly.
- Package manager: **pnpm**. Don't introduce npm/yarn lockfiles.
- ESLint is pinned to the 9.x line. `eslint-config-next`'s bundled plugins
  (`eslint-plugin-import`/`-jsx-a11y`/`-react`) don't support ESLint 10 yet — upgrading breaks
  lint. Re-check before bumping.
- A new package with an install/postinstall script (Prisma, esbuild, etc.) gets its build
  script blocked by pnpm by default. `pnpm approve-builds` is interactive and won't work in
  a non-interactive shell — instead add the package to `allowBuilds` in `pnpm-workspace.yaml`
  and re-run `pnpm install`.
- Docker Desktop does not start automatically on this machine — if `docker compose` fails
  with a pipe/connection error, launch `Docker Desktop.exe` and wait for the engine before
  retrying.

## Commands

- `pnpm dev` — start the Next.js dev server (Turbopack, default since Next 16).
- `pnpm test` — run Vitest once. `pnpm test:watch` for watch mode.
- `pnpm typecheck` — `tsc --noEmit`. Run `pnpm exec next typegen` first if it fails on
  `LayoutProps`/`PageProps`/etc. not found — those are generated route-type helpers.
- `pnpm lint` — ESLint (flat config; `next lint` was removed in Next 16).
- `pnpm build` — production build.
- `docker compose up -d` — start local Postgres (must be running before any `db:*` command
  or `pnpm dev` route that touches the database).
- `pnpm db:migrate` — create/apply a Prisma migration.
- `pnpm db:studio` — inspect the DB.
- `pnpm db:seed` — run `prisma/seed.ts`.
- `prisma generate` also runs automatically on `pnpm install` (`postinstall` script).

## Next.js 16 / Prisma 7 — read before assuming API shape

Both frameworks jumped a major version very recently and changed things a training-data-only
model would get wrong. Two agent-maintained doc sources are checked into this repo:

- `AGENTS.md` (root) — points at `node_modules/next/dist/docs/`. Notably: `params`/
  `searchParams`/`cookies()`/`headers()` are async everywhere now; Turbopack is the default
  (no `--turbopack` flag needed); `next lint` is removed (bare `eslint` instead); route types
  come from generated helpers (`LayoutProps<'/path'>`, `PageProps<'/path'>`) that need
  `next typegen` (or a dev/build run) before `tsc` sees them.
- `.agents/skills/prisma-*` — Prisma 7 requires a driver adapter (`@prisma/adapter-pg` + `pg`
  here) passed to `new PrismaClient({ adapter })`; there's no bundled query-engine binary
  fallback. The datasource URL lives in `prisma.config.ts` (via `env('DATABASE_URL')`), not in
  `schema.prisma`. The generator is `provider = "prisma-client"` with an explicit `output`
  (`src/generated/prisma` here) — import from `@/generated/prisma/client`, not
  `@prisma/client`.

If something about routing, caching, or Prisma client setup doesn't work the way you expect,
check these docs before guessing — don't silently fall back to pre-16/pre-7 patterns.

## Architecture rules

- Layering is `UI (app/) → API routes (thin) → domain services (src/server/domain/**) →
  repositories → Prisma`. Route handlers parse/validate input and call one service method;
  they do not contain business logic.
- All AI calls go through `src/server/ai/provider.ts`'s `AIProvider` interface. Never call
  the Anthropic SDK directly from a route handler, a React component, or a domain service —
  only from a provider implementation.
- Every AI response is validated with its Zod schema (`src/server/ai/schemas/*`) before it
  touches the database. An invalid response is a handled failure (session stays `PENDING`,
  original text preserved), never a crash and never persisted as-if-valid.
- There is no auth/session system in the MVP. The current user is the server-side constant
  `DEFAULT_USER_ID` (see `src/lib/constants.ts`), resolved from the one seeded user — never
  taken from client-supplied input. Every domain table still carries `userId`; keep it that
  way so real auth can be added later by replacing this constant lookup, not by migrating data.
- Mistake dedup relies on the AI-proposed `patternKey` per mistake, normalized in
  `mistakePatternService`. Don't build separate fuzzy-matching/embedding-based clustering for
  this — see SPEC.md §6 for why that tradeoff was chosen.

## Testing conventions

- Never assert exact LLM output text. Mock `AIProvider` at the boundary; test service
  behavior (persistence, pattern updates, error handling) and pure logic (schema validation,
  mastery transitions, exercise selection) directly.
- Integration tests that touch Postgres use `english_coach_test` (via
  `createTestPrismaClient()` / `resetDatabase()` in `src/server/db/test-utils.ts`), never the
  dev database. Postgres must be running (`docker compose up -d`) before `pnpm test`.
- `vitest.config.mts` sets `fileParallelism: false`. Integration test files share one real
  database and race each other's truncate/seed steps if run in parallel — don't remove this
  to "speed things up" without giving each test file its own isolated data (e.g. per-file user
  ids) first.

## Workflow

- Work in the small phases listed in the roadmap the human approved; after each phase, run
  typecheck + lint + relevant tests before calling it done.
- Don't add features beyond the current phase's scope without checking in first.
