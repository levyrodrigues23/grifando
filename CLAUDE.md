# CLAUDE.md

Inglesando — a personal AI English coach. Full product spec: `SPEC.md`. Read it before working on any
feature-level change — this file only covers things a future session needs that aren't
obvious from the code.

## Design system — "Warm cream editorial"

Single light theme (no dark mode, no toggle) adapted from a user-supplied style reference
(an editorial, magazine-spread product page). Full token list and rationale: `DESIGN.md`.
Tokens live in `src/app/globals.css`'s `:root`. Don't reintroduce Tailwind stock colors, the
old dark "Darkroom" palette, or a dark theme.

- **Surfaces, not shadows**: canvas `--background` #faf9f6, `--linen` #f1eee9 for bands and
  secondary panels, white `--card` with a `ring-border` (#dedbd6) hairline. No `box-shadow`,
  no gradients. Sections are separated by tone and space (64-96px), not divider lines.
- **Type**: Inter 300 for display/headings via the `text-display-lg`/`text-display`/
  `text-heading-lg`/`text-heading`/`text-heading-sm` utilities (never 600+ for display);
  Inter 400 body; Source Serif 4 300 (`prose-serif`) for the learner's own prose, corrections
  and standfirsts; JetBrains Mono `label-mono` (12px, uppercase, +0.1em) for tags/metadata
  only. Sentence content is never uppercased. No kicker/eyebrow label above a heading.
- **Radius is 4px everywhere** (`--radius`; all `rounded-*` scale tokens map to it). Buttons,
  inputs, cards, badges. No pills.
- **Primary button is black** (`--primary` #000). Secondary actions are `outline` (white +
  ink border) or `ghost`.
- **Violet #0007cb is rare on purpose**: focus outlines and mistake marks in
  `HighlightedText.tsx`/`MistakeCard.tsx` only. Progress/score bars are ink on stone, not
  violet. Don't add violet hovers to everyday chrome.
- **`--destructive` #b3261e and `--success` #3f6a35** are not in the reference; reuse them for
  every error/positive state, don't invent a third semantic color.
- **Page layout**: every route uses `PageShell` + `PageHeader` (`components/layout/PageHeader.tsx`):
  1200px column, whisper-weight headline left, serif standfirst column right. Writing inputs use
  `WritingSheet` (white sheet, serif text), not a boxed `Textarea`. Nav is tab-style with a 2px
  ink underline for the active route (`NavLinks.tsx`).
- `--smoke` is #767676, darker than the reference's #888, so placeholders meet 4.5:1.

## Stack & versions (pinned deliberately — do not "helpfully" bump)

- Current pins: `next` and `eslint-config-next` 16.4.5, `zod` 4.6.7, `@google/genai` 3.0.0,
  `@vercel/analytics` 2.0.1 (exact versions). Transitive security fixes are forced through
  `overrides` in `pnpm-workspace.yaml`; don't remove an override without re-running
  `pnpm audit`.

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
- Use `127.0.0.1`, not `localhost`, in `DATABASE_URL`/`TEST_DATABASE_URL`. On this Windows
  machine Prisma's pg adapter fails with `P1001` against `localhost:5432` even though the
  container is up and a plain Node TCP connect works; `127.0.0.1` connects fine.
- Generate migrations with `pnpm db:migrate` against a running Postgres. If one ever has to be
  hand-written (DB unreachable), match the existing `migration.sql` conventions exactly,
  re-run `prisma generate`, and leave a note here until it has been applied.

## Commands

- `pnpm dev` — start the Next.js dev server (Turbopack, default since Next 16).
- `pnpm test` — run Vitest once. `pnpm test:watch` for watch mode.
- `pnpm typecheck` — `next typegen && tsc --noEmit`. The typegen step generates the route-type
  helpers (`LayoutProps`/`PageProps`); without it `tsc` fails on a fresh checkout. If `tsc`
  reports syntax errors inside `.next/dev/types/`, a dev server was killed mid-write — delete
  that folder and re-run.
- `pnpm lint` — ESLint (flat config; `next lint` was removed in Next 16).
- `pnpm check` — typecheck + lint + test, the same gates CI runs (CI also builds).
- `pnpm build` — production build.
- `docker compose up -d` — start local Postgres (must be running before any `db:*` command
  or `pnpm dev` route that touches the database).
- `pnpm db:migrate` — create/apply a Prisma migration (dev). `pnpm db:deploy` applies existing
  migrations without creating new ones.
- `pnpm db:test:prepare` — create `english_coach_test` if missing and apply all migrations to
  it (`scripts/prepare-test-db.ts`). Run after pulling new migrations, before `pnpm test`.
- `pnpm db:studio` — inspect the DB.
- `prisma generate` also runs automatically on `pnpm install` (`postinstall` script).

## Next.js 16 / Prisma 7 — read before assuming API shape

Both frameworks jumped a major version very recently and changed things a training-data-only
model would get wrong. Agent-maintained doc sources:

- `AGENTS.md` (root) — points at `node_modules/next/dist/docs/`. Notably: `params`/
  `searchParams`/`cookies()`/`headers()` are async everywhere now; Turbopack is the default
  (no `--turbopack` flag needed); `next lint` is removed (bare `eslint` instead); route types
  come from generated helpers (`LayoutProps<'/path'>`, `PageProps<'/path'>`) that need
  `next typegen` (or a dev/build run) before `tsc` sees them.
- Prisma 7 (agent skills for it may exist locally in the git-ignored `.agents/skills/prisma-*`) requires a driver adapter (`@prisma/adapter-pg` + `pg`
  here) passed to `new PrismaClient({ adapter })`; there's no bundled query-engine binary
  fallback. The datasource URL lives in `prisma.config.ts` (`process.env.DATABASE_URL`, not `env()`, so `prisma generate` runs without a database), not in
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
- There is no login. Each browser gets an anonymous session: `src/proxy.ts` mints a signed
  `ig_session` cookie (HMAC via `SESSION_SECRET`, `src/server/session/sessionToken.ts`, pure and
  importable from the proxy) and also forwards it on the request so the same render sees it.
  `getCurrentUserId()` (`src/server/session/currentUser.ts`) reads and verifies it — read-only,
  safe in Server Components, never taken from client input. The `User` row is created lazily:
  every POST/DELETE route calls `ensureUser(prisma, userId)` before its service. Every domain
  table still carries `userId`. Route tests must `vi.mock("@/server/session/currentUser")`
  (`cookies()` doesn't exist outside a request).
- Mistake dedup relies on the AI-proposed `patternKey` per mistake, normalized in
  `mistakePatternRepository.upsertPattern` (`src/server/domain/mistakes/patternKey.ts`). Don't
  build separate fuzzy-matching/embedding-based clustering for this — see SPEC.md §6.
- `getAIProvider()` in `src/server/ai/client.ts` builds the real client from the credentials
  resolved by `resolveAICredentials` (`src/server/ai/credentials.ts`): the visitor's key from
  the `x-ai-provider`/`x-ai-key` headers first; only outside production does it fall back to
  `AI_PROVIDER` (`"anthropic"` default, or `"gemini"`) plus that provider's key/model env vars.
  It throws lazily on first use, not at import time, so importing
  AI modules never breaks tests that don't need a real key. `AIProvider` methods (currently
  `analyzeWriting`/`generateExercises`/`continueInterview`/`explainAttempt`) are added one at a time, only when
  a feature phase needs them — don't pre-add stub methods, and implement any new one in *both*
  `providers/anthropic.ts` and `providers/gemini.ts` (the interface is the contract; letting one
  provider silently lag breaks the "swap providers freely" premise the whole abstraction exists
  for).
- `createAnthropicProvider`/`createGeminiProvider` each take a minimal client shape (just the
  one method they call — `messages.create` / `models.generateContent`), not the full SDK class,
  specifically so tests can pass a plain `{ ...: vi.fn() }` fake instead of mocking the SDK.
- The two providers get structured output two different ways — **don't try to unify them,
  the mechanisms are genuinely different**: Anthropic forces a `tool_use` block via
  `tool_choice: { type: "tool", name }` and reads `toolUseBlock.input`; Gemini uses native JSON
  mode (`responseMimeType: "application/json"` + `responseJsonSchema`) and `JSON.parse`s
  `response.text`. Both hand the parsed value to the exact same Zod schema afterward, and both
  funnel exercise-generation's provider-agnostic checks (count matches the request, MC
  `correctOptionIndex` in range) through the one shared `validateExerciseGenerationResult`
  (`src/server/ai/schemas/exerciseGeneration.ts`) — extend that function, don't reimplement the
  checks in a provider file.
- Gemini model is pinned to `gemini-3.5-flash` (exact id, never a `-latest` alias). `gemini-3.8-flash`
  was the first choice but measured ~88s per analysis in Nov 2026 — past the 60s timeout, so every
  call read as "busy". Re-measure before moving to a newer model. The key test
  (`testAIKey`) uses the light fallback model so a slow primary never fails a valid key.
- Exercise generation and exercise grading are two separate services
  (`createExerciseGenerationService` / `createExerciseAttemptService` in
  `src/server/domain/exercises/exerciseService.ts`), not one. Grading is fully deterministic
  (`answerChecking.ts` — exact match after case/whitespace/trailing-punctuation normalization
  against the generator's `acceptableAnswers`; no second AI call) and must never require
  `ANTHROPIC_API_KEY`. Don't merge them back into one service with an `aiProvider` dependency.
- Known tradeoff in `answerChecking.ts`: REWRITE/TRANSLATION grading is a normalized string
  match against 1-3 model-provided acceptable answers, not an AI judgment call. A valid
  rephrasing the generator didn't anticipate will read as incorrect. Accepted for MVP simplicity
  and cost; revisit with an AI-graded path only if this proves too strict in practice.
- `toPublicExercise` (`src/server/domain/exercises/publicView.ts`) is the only thing that should
  ever shape an exercise for the client before an attempt — it strips `correctOptionIndex`/
  `acceptableAnswers`/`explanation`. Never send a raw `Exercise.promptData` to the client.
- Every client component's `fetch` call must check `response.ok` before touching the JSON body
  — an error response here is still valid JSON (`{ error: "..." }`), so skipping the check
  silently misreads a failure as empty/successful data instead of showing the error state. Hit
  this as a real bug in `ExercisePractice.tsx`'s initial load; fixed, but re-check any new
  `fetch` call added to a client component.
- Explain Code's pasted `codeSnippet` is intentionally never persisted — `writingCoachService.
  submitWriting` destructures it out of the input before `sessions.create()` and only forwards
  it to `aiProvider.analyzeWriting()` for context. `WritingSession` has no `codeSnippet` column;
  don't add one without deciding to actually store the code (would need a migration, which
  needs a live DB to create). Technical/Daily Writing prompts are plain static data
  (`src/server/domain/writing/{dailyPrompt,technicalPrompts}.ts`) resolved server-side in
  `/write`'s page component from a `?promptId=`/`?mode=daily` query param — never trust a
  client-supplied prompt string for what gets analyzed or stored.
- The dashboard (`src/app/page.tsx`) is a Server Component that queries repositories directly
  (`Promise.all` of several parallel reads), the same pattern as `/mistakes` and `/technical` —
  no API route needed for a read-only page. The dashboard-specific repository methods
  (`writingSessionRepository.countAnalyzed`/`listRecentAnalyzed`,
  `exerciseAttemptRepository.countByUser`, `mistakePatternRepository.listRecentByUser`, and the
  streak's `listAnalyzedDates`/`listAttemptDates`) exist
  only for this; reuse them rather than adding near-duplicate query methods elsewhere.
  `computeAverageScores` (`src/server/domain/progress/progress.ts`) is the one place that
  averages scores across sessions — deliberately simple (a rounded mean), per SPEC.md's
  "avoid fake precision" warning about heuristic scores.

## Public deployment model (BYOK, rate limits, privacy)

- **BYOK.** The visitor's AI key lives only in their browser (`localStorage`, `src/lib/aiKeyStore.ts`)
  and is attached by `aiFetch` (`src/lib/aiFetch.ts`) as `x-ai-provider`/`x-ai-key` headers on
  same-origin requests. It must never be persisted in the DB, logged (`logError` strips it;
  `noKeyInLogs.test.ts` guards this), put in a URL, sent to analytics, or committed. Production
  never falls back to env-var keys. `/api/ai-key/test` validates a key.
- **AI resilience** (`src/server/ai/resilient.ts`): 60s timeout and one fallback model
  (`gemini-3.5-flash-lite` / `claude-haiku-5-5`) on overload only; key/quota/validation errors
  never trigger the fallback. User text is never lost when an AI call fails.
- **Rate limits** (`src/server/rateLimit.ts`): fixed windows in Postgres (`RateLimitWindow`), per
  user and per hashed client IP (`IP_HASH_SALT`; the raw IP is never stored). AI-calling routes
  go through the `analysis`/`generation` buckets, key tests through `keyTest`.
- **`src/proxy.ts`** mints the session cookie and sets the per-request CSP nonce and security
  headers. New inline scripts/styles need the nonce; don't loosen the CSP to fix one.
- **Privacy**: `/privacy` (EN + PT), `DELETE /api/me` (user deletes own data), and the daily
  cron `/api/cron/cleanup` (bearer `CRON_SECRET`, scheduled in `vercel.json`) that deletes users
  idle 90 days and old rate-limit windows. No login, email or PII.
- **Env vars** (see `.env.example`): `DATABASE_URL`, `TEST_DATABASE_URL`, `SESSION_SECRET`,
  `IP_HASH_SALT`, `CRON_SECRET` (the three secrets are required in production),
  `NEXT_PUBLIC_SITE_URL` (optional), and the local-development-only `AI_PROVIDER`,
  `GEMINI_API_KEY`/`GEMINI_MODEL`, `ANTHROPIC_API_KEY`/`ANTHROPIC_MODEL`.
- CI runs gitleaks and `pnpm audit --prod --audit-level high` besides check + build.

## Lint gotcha: impure calls in Server Components

`eslint-plugin-react-hooks`'s purity rule flags `Date.now()`/`Math.random()`/etc. called
directly in a component's body — even an `async` Server Component just computing a filter
date for a DB query, which is completely legitimate there. Fix: pull the impure call into a
plain (non-component, non-PascalCase-as-the-export) helper function and call that from the
component, rather than disabling the rule. See `resolveSinceDate` in `src/app/mistakes/page.tsx`.

## Build gotcha: static prerendering of DB-backed pages

A Server Component page with no `searchParams`/`cookies()`/other dynamic-API usage gets
statically prerendered at **build time** by default — including any Prisma queries in its
body. `pnpm build` will try to hit the database while building, which both fails when Postgres
isn't up and is semantically wrong for a page that should show fresh per-request data anyway.
Fix: `export const dynamic = "force-dynamic";` on any page that queries the DB but has no other
dynamic signal (see `src/app/page.tsx`). Pages that already read `searchParams` (`/write`,
`/mistakes`) are dynamic automatically and don't need this.

## Testing conventions

- Never assert exact LLM output text. Mock `AIProvider` at the boundary; test service
  behavior (persistence, pattern updates, error handling) and pure logic (schema validation,
  mastery transitions, exercise selection) directly.
- Integration tests that touch Postgres use `english_coach_test` (via
  `createTestPrismaClient()` / `resetDatabase()` in `src/server/db/test-utils.ts`), never the
  dev database. Postgres must be running (`docker compose up -d`) and the test DB prepared
  (`pnpm db:test:prepare`) before `pnpm test`.
- `vitest.config.mts` sets `fileParallelism: false`. Integration test files share one real
  database and race each other's truncate/seed steps if run in parallel — don't remove this
  to "speed things up" without giving each test file its own isolated data (e.g. per-file user
  ids) first.

## Workflow

- Work in the small phases listed in the roadmap the human approved; after each phase, run
  typecheck + lint + relevant tests before calling it done.
- Don't add features beyond the current phase's scope without checking in first.
- Git flow, branch naming, labels, and PR rules live in `CONTRIBUTING.md`. In short: branch
  from `develop`, PR back to `develop` (CI must be green), `develop` → `main` for releases.
  The GitHub repo is `levyrodrigues23/inglesando` (renamed from `projeto_ingles`; the local
  folder kept the old name).
- Work is tracked as GitHub issues written in Portuguese. The current roadmap is the
  retention epic (#8); read SPEC.md §6.1 before
  touching mastery, exercise selection, or scheduling.
- Don't add the "Generated with Claude Code" footer to PR descriptions.
