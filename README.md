<img src="./public/logo.svg" alt="" width="48" height="48" align="left">

# Inglesando

A personal AI English coach for a Brazilian developer: it learns from your own mistakes and
turns them into practice — not a generic grammar checker, not a chat window in front of an
LLM.

[![CI](https://github.com/levyrodrigues23/inglesando/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/levyrodrigues23/inglesando/actions/workflows/ci.yml)

## Documentation

| Document | What it covers |
|---|---|
| [`SPEC.md`](./SPEC.md) | Product spec: purpose, features, domain model, what is out of scope |
| [`CLAUDE.md`](./CLAUDE.md) | Development conventions: architecture rules, design system, pinned versions, gotchas |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | Git flow, branches, issues, PRs, labels, CI |
| [`docs/research/duolingo.md`](./docs/research/duolingo.md) | How Duolingo drives retention, and how it maps onto this app (roadmap source) |
| [`AGENTS.md`](./AGENTS.md) | Next.js 16 notes for coding agents |

## Features

- **Writing Coach** — write freely and get structured feedback: corrected text, a separate
  "natural" rephrasing, inline mistake highlights linked to explanations, and heuristic scores.
- **Mistake Notebook** — recurring mistakes collapse into patterns (not one row per typo), with
  frequency, mastery, and a category breakdown.
- **Personalized exercises** — multiple choice, fill-in-the-blank, rewrite, and translation
  exercises generated from your own weak patterns, with an active-recall flow.
- **Daily Writing** — a rotating challenge prompt, biased toward your current weak categories.
- **Technical English** — prompts across 14 developer categories (backend, git, system design, …).
- **Explain Code** — paste a snippet, explain what it does in English; the code is context
  only, never graded itself.
- **Interview Practice** — a turn-based text interview that scores each answer, including how
  clearly you communicate technical ideas.
- **Dashboard** — today's challenge, progress summary, weak areas, a practice recommendation,
  and recent activity.
- **Focus Music** — a header player: paste a Spotify or YouTube playlist link and keep it
  playing while you study.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript 5.9 · Tailwind CSS 4 + shadcn/ui · PostgreSQL 17
· Prisma 7 · Zod 4 · Vitest · Anthropic Claude or Google Gemini (either works) · pnpm

## Prerequisites

- Node.js 22+ (`.nvmrc` pins the version CI uses)
- pnpm (version pinned in `package.json` → `packageManager`; `corepack enable` picks it up)
- Docker Desktop (local Postgres)
- An Anthropic or Google Gemini API key

## Local setup

```bash
pnpm install                 # also runs `prisma generate`
cp .env.example .env         # then set AI_PROVIDER and that provider's API key
docker compose up -d         # Postgres on 127.0.0.1:5432
pnpm db:deploy               # apply migrations to the dev database
pnpm dev                     # http://localhost:3000
```

To run the test suite, prepare the separate test database once (and again after pulling new
migrations):

```bash
pnpm db:test:prepare         # creates english_coach_test and migrates it
pnpm test
```

## Environment variables

See [`.env.example`](./.env.example):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Dev database. Use `127.0.0.1`, not `localhost` (see Troubleshooting). |
| `TEST_DATABASE_URL` | Separate database for integration tests — they wipe it. |
| `AI_PROVIDER` | `anthropic` (default) or `gemini`. Only that provider's key is required. |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | Used when `AI_PROVIDER=anthropic`. |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | Used when `AI_PROVIDER=gemini`. |

Tests never need an AI key: the AI provider is mocked.

## Commands

| Command | Description |
|---|---|
| `pnpm dev` | Dev server (Turbopack) |
| `pnpm build` / `pnpm start` | Production build / run it |
| `pnpm check` | Typecheck + lint + tests (what CI runs, minus the build) |
| `pnpm typecheck` | Generate route types, then `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm test` / `pnpm test:watch` | Vitest once / in watch mode |
| `pnpm db:migrate` | Create and apply a new migration (dev) |
| `pnpm db:deploy` | Apply existing migrations |
| `pnpm db:test:prepare` | Create and migrate the test database |
| `pnpm db:studio` | Prisma Studio |

## Troubleshooting

- **`P1001: Can't reach database server at localhost:5432`** while the container is healthy:
  use `127.0.0.1` in `DATABASE_URL`/`TEST_DATABASE_URL` (the template already does).
- **`docker compose` fails with a pipe/connection error** (Windows): Docker Desktop isn't
  running. Start it and wait for the engine.
- **`tsc` errors inside `.next/dev/types/`**: a dev server was killed while writing route
  types. Delete `.next/dev/types` and run `pnpm typecheck` again.
- **A package's postinstall script is blocked by pnpm**: add it to `allowBuilds` in
  `pnpm-workspace.yaml` and re-run `pnpm install` (`pnpm approve-builds` is interactive).

## Project status

The MVP from `SPEC.md` is complete. The next phase turns the corrector into a coach that
makes you *retain* what you learn — spaced repetition on mistake patterns, review queue,
mixed daily session, difficulty targeting, a light streak. It is tracked in the
[retention epic (#8)](https://github.com/levyrodrigues23/inglesando/issues/8); the reasoning is
in [`docs/research/duolingo.md`](./docs/research/duolingo.md).
