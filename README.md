# AI English Coach

A personal writing coach for English that learns from your own mistakes and turns them into
practice — not a generic grammar checker, not a chat window in front of an LLM. Full product
spec in [`SPEC.md`](./SPEC.md); development conventions in [`CLAUDE.md`](./CLAUDE.md).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript 5.9 · Tailwind CSS 4 + shadcn/ui · PostgreSQL
· Prisma 7 · Zod 4 · Vitest · Anthropic Claude API · pnpm

## Prerequisites

- Node.js 22+
- pnpm
- Docker Desktop (for local Postgres)
- An Anthropic API key

## Local setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy the environment template and fill in your Anthropic API key:

   ```bash
   cp .env.example .env
   ```

3. Start Postgres:

   ```bash
   docker compose up -d
   ```

4. Apply database migrations:

   ```bash
   pnpm db:migrate
   ```

5. Start the dev server:

   ```bash
   pnpm dev
   ```

   The app runs at [http://localhost:3000](http://localhost:3000).

## Environment variables

See [`.env.example`](./.env.example):

- `DATABASE_URL` — Postgres connection string.
- `ANTHROPIC_API_KEY` — your Claude API key.
- `ANTHROPIC_MODEL` — model id used for writing analysis and exercise generation.

## Commands

| Command | Description |
|---|---|
| `pnpm dev` | Start the dev server |
| `pnpm build` | Production build |
| `pnpm start` | Run the production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript, no emit |
| `pnpm test` | Run tests once |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm db:migrate` | Create/apply a Prisma migration |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm db:seed` | Seed the database |

## Project status

In active, incremental development. See `SPEC.md` for the roadmap and current MVP scope.
