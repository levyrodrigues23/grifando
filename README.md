<img src="./public/logo.svg" alt="" width="48" height="48" align="left">

# Inglesando

An AI English coach for Portuguese-speaking developers. You write, it proofreads, and it turns
your recurring mistakes into practice. It is not a generic grammar checker and not a chat
window in front of an LLM.

**Live: <https://inglesando.vercel.app>** (no login; bring your own AI key, see [Try it](#try-it))

[![CI](https://github.com/levyrodrigues23/inglesando/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/levyrodrigues23/inglesando/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

<p>
  <img src="./docs/screenshots/home-desktop.png" alt="Inglesando home page on desktop: today's challenge and a worked example with three marked mistakes" width="720">
  <img src="./docs/screenshots/home-mobile.png" alt="Inglesando home page on a phone" width="180">
</p>

## Try it

1. Create a free Google Gemini key at <https://aistudio.google.com/apikey>.
2. Open <https://inglesando.vercel.app/settings>, paste the key, and test it.
3. Go to `/write` and write something.

Your key stays in your browser (see [Privacy](#privacy)). Anthropic keys work too. A free
Gemini key is convenient, but Google may use prompts sent through free-tier keys to improve its
products, so do not write anything confidential with one.

## Who it is for

Brazilian developers who read English well and want to write it better: PR descriptions,
issues, code reviews, interview answers. Explanations are in English, with Portuguese where it
clarifies why a literal translation fails ("I have 25 years" instead of "I am 25 years old").
It is open source so you can read it, run it, or host your own copy.

## The mistake loop

1. **Write first.** Free writing, a daily challenge, a Technical English prompt, a code
   explanation, or an interview answer. There is no "fix my text" button without writing.
2. **Get a proofed page.** The model separates *incorrect* from *correct but unnatural* from
   *natural*, marks each mistake inline, and explains it. Your original intent is preserved;
   the natural version is offered as a separate alternative.
3. **Mistakes become patterns.** A recurring error collapses into one pattern with frequency,
   category and mastery, not one row per typo.
4. **Patterns become exercises.** Multiple choice, fill-in-the-blank, rewrite and translation
   exercises are generated from your own weak patterns, with answer-before-reveal recall.
   Grading is deterministic; the AI is not called to grade.
5. **Progress is shown honestly.** Scores are heuristic model signals, not CEFR levels.

Other features: dashboard with streak, vocabulary, turn-based interview practice, Explain Code
(pasted code is context only and is never stored), and a focus-music player.

## Privacy

There is no login and no email. The app issues each browser an anonymous signed cookie; your
data hangs off that random id.

- **Bring your own key.** You paste a Google Gemini or Anthropic key on `/settings`. It lives
  in your browser's `localStorage` and is sent only in request headers to this app's own
  routes, which forward it to the provider for that one request. The server never stores,
  logs, or puts it in a URL or in analytics, and in production it never falls back to a
  server-side key.
- **You can delete everything** from the app (`DELETE /api/me`), and accounts idle for 90 days
  are removed by a daily cron job.
- **Free Gemini keys:** Google may use prompts sent through free-tier API keys to improve its
  products. Do not write anything confidential, and prefer a billed key if that matters.
- Rate limits are kept in Postgres, keyed by user id and a salted hash of the IP, never the
  raw IP.

The full text, in English and Portuguese, is on the `/privacy` page. Reporting a
vulnerability: see [`SECURITY.md`](./SECURITY.md).

## Run it locally

Requires Node.js 22+, pnpm (`corepack enable`), and Docker (for Postgres).

```bash
pnpm install                 # also runs `prisma generate`
cp .env.example .env         # then generate SESSION_SECRET, IP_HASH_SALT, CRON_SECRET
docker compose up -d         # Postgres on 127.0.0.1:5432
pnpm db:deploy               # apply migrations
pnpm dev                     # http://localhost:3000
```

For AI you have two options: open `/settings` and paste a key (the same flow as production),
or set `AI_PROVIDER` plus `GEMINI_API_KEY` or `ANTHROPIC_API_KEY` in `.env`. Those server-side
variables are for local development only and are ignored in production. A free Gemini key is
available at <https://aistudio.google.com/apikey>.

Tests never need an AI key (the provider is mocked) but do need Postgres:

```bash
pnpm db:test:prepare         # creates english_coach_test and migrates it
pnpm check                   # typecheck + lint + tests, what CI runs (CI also builds)
```

All variables are documented in [`.env.example`](./.env.example). Use `127.0.0.1`, not
`localhost`, in the database URLs.

## Deploy your own on Vercel

Import the repository into Vercel and add a Postgres database (Neon, via the Vercel
Marketplace). Set `SESSION_SECRET`, `IP_HASH_SALT` and `CRON_SECRET` and deploy. The build
command comes from `vercel.json` (`pnpm vercel-build`): it checks the required secrets, applies
migrations on production builds, then runs `next build`. `vercel.json` also registers the daily
cleanup cron. Do not set any AI keys; visitors bring their own. Step by step (in Portuguese):
[`docs/deploy.md`](./docs/deploy.md).

## Architecture

```
UI (src/app) -> thin API routes -> domain services (src/server/domain) -> repositories -> Prisma
```

| Path | Role |
|---|---|
| `src/app/` | Next.js App Router pages and thin route handlers under `api/` |
| `src/proxy.ts`, `src/server/session/` | Anonymous signed-cookie sessions; CSP nonce and security headers |
| `src/server/ai/` | `AIProvider` interface, Anthropic and Gemini providers, BYOK credentials, timeout and fallback model, Zod schemas for every AI response |
| `src/server/domain/` | Business logic: writing, mistakes, exercises, interview, progress, vocabulary, privacy |
| `src/server/rateLimit.ts` | Postgres fixed-window rate limits |
| `prisma/` | Schema and migrations (Prisma 7 with the `pg` driver adapter) |

Stack: Next.js 16, React 19, TypeScript 5.9, Tailwind CSS 4 with shadcn/ui, PostgreSQL,
Prisma 7, Zod 4, Vitest, pnpm.

## Documentation

| Document | What it covers |
|---|---|
| [`SPEC.md`](./SPEC.md) | Product spec: purpose, features, domain model, out of scope |
| [`DESIGN.md`](./DESIGN.md) | Design system: tokens, type, layout rules |
| [`CLAUDE.md`](./CLAUDE.md) | Development conventions: architecture rules, pinned versions, gotchas |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | Git flow, branches, issues, PRs, CI, AI review |
| [`docs/deploy.md`](./docs/deploy.md) | Deploying your own copy on Vercel (Portuguese) |
| [`SECURITY.md`](./SECURITY.md) | How to report a vulnerability |
| [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md) | Contributor Covenant 2.1 |
| [`docs/research/duolingo.md`](./docs/research/duolingo.md) | Retention research that drives the roadmap |

## Contributing

Read [`CONTRIBUTING.md`](./CONTRIBUTING.md) and [`CLAUDE.md`](./CLAUDE.md) first: versions of
TypeScript, Prisma and ESLint are pinned on purpose. Branch from `develop` and open PRs
against it; CI (typecheck, lint, tests, build, secret scan, `pnpm audit`) must be green.
Issues are written in Portuguese; code, commits and docs in English. Branch PRs also get an
AI review from PR-Agent.

The repository also ships material for coding agents: `AGENTS.md` and `.agents/` (Next.js 16
and Prisma 7 notes that `CLAUDE.md` points to) and `skills-lock.json` (the pinned agent skills).
You do not need them to contribute by hand.

## License

[MIT](./LICENSE)
