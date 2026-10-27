# CLAUDE.md

Inglesando — a personal AI English coach. Full product spec: `SPEC.md`. Read it before working on any
feature-level change — this file only covers things a future session needs that aren't
obvious from the code.

## Design system — "Darkroom product editorial"

Single dark theme (no light mode, no toggle) adapted from a user-supplied reference built for
a product-showcase landing page. Tokens live in `src/app/globals.css`'s `:root` (mirrored in
`.dark` in case that class is ever applied). Fidelity to these tokens matters — don't
reintroduce Tailwind's stock colors (`amber-*`, `emerald-*`, etc.) or a light theme.

- **Palette**: `--background`/`--card`/`--popover` #100904 (Walnut Shadow) — cards are the same
  color as the page and rely on a `ring-border` hairline, not a lighter fill, for separation.
  `--foreground` #ffedd7 (Warm Cream). `--primary` #382416 (Bark Brown, the one filled-button
  color). `--border`/`--input` #40372e (Cork Border). `--muted-foreground` a lightened
  Driftwood (#a08e79) for readable secondary text. `--ember` / `--ring` #dc5000 is the *rare*
  accent — see below.
- **Ember is rare on purpose**: reserved for focus rings, the progress/score-bar fill, and
  highlighted mistake spans in `HighlightedText.tsx` — deliberately *not* wired into generic
  nav-link hovers or the Button/Badge `link` variant (those use underline + cream text
  instead). Don't add `hover:text-ember` or similar to everyday chrome; it breaks the "rarity"
  the reference explicitly calls for.
- **`--destructive` (#c1442e) and `--success` (#7c8f5a) are not in the source reference** — a
  product-showcase page never needed error/positive states. They're a warm red and a muted
  warm green mixed to fit the existing palette family. Reuse them for anything error/positive
  (form validation, "Incorrect"/"Correct" badges, mastery states); don't invent a third
  ad-hoc semantic color.
- **Uppercase is for chrome, not content**: nav, `CardTitle`, buttons, and badges are
  `uppercase tracking-normal` (baked into those components, not applied per-page). Body text —
  AI feedback, mistake explanations, exercise instructions/options, textarea/input content —
  stays normal case. This is a deliberate adaptation of the reference (which uppercases nearly
  everything on a low-density marketing page); a dense app with paragraphs of feedback needs
  the mixed-case readability. Don't uppercase real sentence content to chase literal fidelity.
- **Inputs are underline-only** (`border-0 border-b`, `rounded-none`), not boxed — see
  `input.tsx`/`textarea.tsx`. Buttons are full pill (`rounded-full`) — see `button.tsx`. Cards
  keep the default `rounded-xl` (~12-17px depending on `--radius`), never below that.
- **Dividers are dashed** (`border-dashed`): `SiteHeader`'s bottom border, `CardFooter`'s top
  border, and the `Separator` component all use dashed hairlines, not solid lines — matches
  the reference's "Section Divider (Dashed Hairline)" component.
- Font is Inter (`--font-sans`) + JetBrains Mono (`--font-mono`), the reference's suggested
  substitutes for its licensed display typeface — set in `src/app/layout.tsx`. (This also
  fixed a pre-existing bug: `globals.css` referenced `--font-sans`/`--font-geist-mono` but
  `layout.tsx` only ever set `--font-geist-sans`/`--font-geist-mono`, so `--font-sans` was
  never actually defined and the app silently fell back to a serif system font the whole time
  before this pass.)

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
  `mistakePatternRepository.upsertPattern` (`src/server/domain/mistakes/patternKey.ts`). Don't
  build separate fuzzy-matching/embedding-based clustering for this — see SPEC.md §6.
- `getAIProvider()` in `src/server/ai/client.ts` is the one place that reads `AI_PROVIDER`
  (`"anthropic"` default, or `"gemini"`) plus that provider's API key/model env vars and
  constructs the real client — it throws lazily on first use, not at import time, so importing
  AI modules never breaks tests that don't need a real key. `AIProvider` methods (currently
  `analyzeWriting`/`generateExercises`/`continueInterview`) are added one at a time, only when
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
- Gemini model is pinned to `gemini-3.8-flash` (current stable general-purpose Flash model as
  of this writing, confirmed against Google's own docs — not a `-latest` floating alias, same
  pin-exact-versions philosophy as the rest of this stack).
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
  `exerciseAttemptRepository.countByUser`, `mistakePatternRepository.listRecentByUser`) exist
  only for this; reuse them rather than adding near-duplicate query methods elsewhere.
  `computeAverageScores` (`src/server/domain/progress/progress.ts`) is the one place that
  averages scores across sessions — deliberately simple (a rounded mean), per SPEC.md's
  "avoid fake precision" warning about heuristic scores.

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
  retention epic (#8), planned from `docs/research/duolingo.md` — read its Part A before
  touching mastery, exercise selection, or scheduling.
- Don't add the "Generated with Claude Code" footer to PR descriptions.
