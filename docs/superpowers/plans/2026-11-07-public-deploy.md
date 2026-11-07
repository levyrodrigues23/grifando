# Public Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Inglesando to Vercel as a public, login-free, bring-your-own-key app, and make the repository presentable and safe to open to the public.

**Architecture:** A Next 16 proxy mints a signed anonymous-session cookie and a CSP nonce on every request; server code resolves the current user from that cookie instead of `DEFAULT_USER_ID`. AI providers are built per request from the visitor's provider/key headers (keys live only in the visitor's `localStorage`), wrapped in a timeout + overload-fallback layer. Rate limits move from process memory to Postgres fixed windows keyed by session and hashed IP.

**Tech Stack:** Next.js 16 (App Router, Turbopack, `src/proxy.ts`), React 19, Tailwind 4, Prisma 7.10.0 + `@prisma/adapter-pg`, Zod 4, Vitest 5, `@google/genai`, `@anthropic-ai/sdk`, `@vercel/analytics`, Vercel (Cron, Marketplace Postgres), pnpm.

**Spec:** `docs/superpowers/specs/2026-11-07-public-deploy-design.md`

## Global Constraints

- Pins stay: TypeScript `5.9.3`, Prisma/`@prisma/client` `7.10.0`, ESLint 9.x, pnpm only. New dependencies are pinned exact (no `^`), and only `@vercel/analytics` is added (motion is CSS + one `IntersectionObserver` hook, no animation library).
- Architecture rules in `CLAUDE.md` hold: UI → thin route → domain service → repository → Prisma; AI only through `AIProvider`; every AI response Zod-validated; every client `fetch` checks `response.ok` first.
- An AI key is **never** persisted in the database, written to a log, sent to analytics, put in a URL, or committed. Production never falls back to env-var AI keys (`NODE_ENV === "production"`).
- No login, email, or PII collection. User text must never be lost because an AI call failed (existing PENDING/retry behaviour stays).
- Visual work follows `DESIGN.md` (warm cream editorial): 4px radius, no shadows/gradients, violet `#0007cb` only for focus and mistake marks. All motion: ease-out, ≤ 400ms per element, content visible without JS, static under `prefers-reduced-motion`, nothing animates inside a field the user is typing in.
- UI copy is English; `/privacy` and the Gemini key guide also carry a Portuguese version.
- Production deploys from `main` only; Vercel preview deployments are disabled; `prisma migrate deploy` runs only when `VERCEL_ENV=production`.
- Env vars: `DATABASE_URL`, `SESSION_SECRET` (≥ 32 random bytes), `IP_HASH_SALT`, `CRON_SECRET`; dev-only `AI_PROVIDER`/`GEMINI_API_KEY`/`ANTHROPIC_API_KEY`/model vars.
- Work branches from `develop`, PRs back to `develop` with CI green; no "Generated with Claude Code" footer in PR bodies.
- Integration tests need `docker compose up -d` and `pnpm db:test:prepare`; stop Docker afterwards (the author's machine is memory-constrained).

## Review Focus

1. **Pasted key with surrounding whitespace or a newline** → stored and sent trimmed; works (test in Task 7).
2. **Key valid for Anthropic but provider set to Gemini (or a revoked key)** → clear "key rejected" message pointing to `/settings`, text kept in the editor, no fallback retry (test in Task 4).
3. **Free-tier quota exhausted (429 `RESOURCE_EXHAUSTED`)** distinct from overload (503) → message says the key's quota is used up; overload alone triggers the lighter-model retry (test in Task 5).
4. **Writing after "Delete my data" in another tab** → the next write lazily recreates the user under the new session and succeeds (test in Task 3).
5. **Oversized or non-printable `x-ai-key` header** → rejected with 400 before any provider call (test in Task 4).

---

### Task 1: Release `develop` → `main` and verify the baseline

No code. Needs Docker and the author's own key in `.env`.

- [ ] **Step 1:** `docker compose up -d && pnpm db:deploy && pnpm db:test:prepare && pnpm check` — Expected: all green.
- [ ] **Step 2:** Manual end-to-end with `pnpm dev`, in order: `/write` (submit text with mistakes → proofed page, save one word to vocabulary) → `/exercises` (generate, answer one right and one wrong, "Explain my answer") → `/mistakes` (both filters) → `/vocabulary` (add, remove) → `/interview` (two turns, end) → `/today` (write → review) → `/technical` → `/explain-code`. Record each route as pass/fail in the PR body; a provider 503 counts as "blocked", not "fail" — retry later.
- [ ] **Step 3:** Issue audit: for each open issue #3–#23 read its acceptance criteria and check the code; list met/unmet in the PR body.
- [ ] **Step 4:** Open PR `develop` → `main` titled "Release: retenção estilo Duolingo + redesign", body lists `Closes #N` for every issue that met its criteria, plus the route table. Merge when CI is green and the author approves. Close epic #8 if all children closed.
- [ ] **Step 5:** `docker compose stop`.

### Task 2: Schema for anonymous users and rate-limit counters

**Files:**
- Modify: `prisma/schema.prisma` (model `User`), add model `RateLimitWindow`
- Create: `prisma/migrations/<timestamp>_anonymous_users_and_rate_limits/migration.sql` (via `pnpm db:migrate`)
- Modify: `src/server/db/test-utils.ts` (`TABLES` gains `"RateLimitWindow"`)

**Interfaces:**
- Produces: `User.email String? @unique`, `User.displayName String?`, `User.lastActiveAt DateTime @default(now())` with `@@index([lastActiveAt])`; `model RateLimitWindow { key String; windowStart DateTime; count Int @default(0); @@id([key, windowStart]) }`.

- [ ] **Step 1:** Edit the schema as above; run `pnpm db:migrate --name anonymous_users_and_rate_limits` (Docker up). Expected: migration created and applied, `prisma generate` ran.
- [ ] **Step 2:** `pnpm db:test:prepare && pnpm typecheck && pnpm test` — Expected: PASS (no code reads the changed fields yet).
- [ ] **Step 3:** Commit `feat(db): allow anonymous users and add rate-limit windows`.

### Task 3: Anonymous session (cookie, proxy, current user)

**Files:**
- Create: `src/server/session/sessionToken.ts`, `src/server/session/sessionToken.test.ts`
- Create: `src/server/session/currentUser.ts`, `src/server/session/currentUser.test.ts`
- Create: `src/proxy.ts`
- Modify: every file listed by `grep -rln DEFAULT_USER_ID src` (7 API routes, 4 pages), `src/lib/constants.ts` (delete `DEFAULT_USER_ID`), delete `src/lib/constants.test.ts`, delete `prisma/seed.ts` and the `seed` entry in `prisma.config.ts` and the `db:seed` script
- Modify: `.env.example` (add `SESSION_SECRET`, `IP_HASH_SALT`, `CRON_SECRET` with generation hint)

**Interfaces:**
- Produces:
  - `SESSION_COOKIE = "ig_session"`
  - `signSessionId(id: string, secret: string): string` → `"<id>.<base64url hmac-sha256>"`
  - `verifySessionToken(token: string | undefined, secret: string): string | null` (constant-time compare via `timingSafeEqual`; `null` on any malformed/tampered input)
  - `newSessionId(): string` (`crypto.randomUUID()`)
  - `getCurrentUserId(): Promise<string>` — reads the cookie via `cookies()`; returns the verified id. Never creates rows. Throws `MissingSessionError` only if the proxy didn't run (should not happen).
  - `ensureUser(prisma, userId: string): Promise<void>` — `upsert` the `User` row (`create: { id }`), and bump `lastActiveAt` only when older than 1 hour. Every **write** route calls it before its service.
- Proxy: on requests without a valid cookie, mint an id, set it on the **response** (`httpOnly`, `secure` in production, `sameSite: "lax"`, `path: "/"`, `maxAge` 365 days) **and** on the forwarded request cookies so the same render sees it. Matcher excludes `_next/static`, `_next/image`, `favicon.ico`, `opengraph-image`, `robots.txt`, `sitemap.xml`. (Task 9 extends this same proxy with CSP.)

- [ ] **Step 1: Write failing tests** in `sessionToken.test.ts`:

```ts
it("round-trips a signed id", () => {
  expect(verifySessionToken(signSessionId("abc", SECRET), SECRET)).toBe("abc");
});
it("rejects a tampered id, a wrong secret, and junk", () => {
  const token = signSessionId("abc", SECRET);
  expect(verifySessionToken(token.replace("abc", "abd"), SECRET)).toBeNull();
  expect(verifySessionToken(token, "other-secret-xxxxxxxxxxxxxxxxxxxxxxxx")).toBeNull();
  for (const junk of [undefined, "", "abc", ".sig", "a.b.c"]) expect(verifySessionToken(junk, SECRET)).toBeNull();
});
```

and in `currentUser.test.ts` (integration, test DB):

```ts
it("creates the user on first write and isolates two sessions", async () => {
  await ensureUser(prisma, "s1"); await ensureUser(prisma, "s2");
  await prisma.vocabularyItem.create({ data: { userId: "s1", term: "t", meaningPt: "m", exampleSentence: "e" } });
  expect(await createVocabularyRepository(prisma).listByUser("s2")).toEqual([]);
});
it("recreates a deleted user on the next write", async () => {
  await ensureUser(prisma, "s1");
  await prisma.user.delete({ where: { id: "s1" } });
  await ensureUser(prisma, "s1");
  expect(await prisma.user.count({ where: { id: "s1" } })).toBe(1);
});
it("bumps lastActiveAt at most once per hour", async () => { /* set lastActiveAt to now-30min → unchanged; now-2h → updated */ });
```

- [ ] **Step 2:** `pnpm test src/server/session` — Expected: FAIL (modules missing).
- [ ] **Step 3:** Implement `sessionToken.ts` (Node `crypto.createHmac`), `currentUser.ts`, `src/proxy.ts`. `SESSION_SECRET` read lazily; missing in production → throw at first use; in dev/test fall back to a fixed dev string with a console warning.
- [ ] **Step 4:** Replace `DEFAULT_USER_ID` in all routes/pages with `await getCurrentUserId()`; add `await ensureUser(prisma, userId)` at the top of every POST/DELETE handler. Pages that only read keep working with a user that has no rows (empty states). Remove constants/seed as listed.
- [ ] **Step 5:** `pnpm check` — Expected: PASS. Manual: fresh browser profile on `pnpm dev` → `/` renders empty state, cookie `ig_session` present; write once → data appears; second browser profile sees nothing.
- [ ] **Step 6:** Update `CLAUDE.md` "Architecture rules" (replace the `DEFAULT_USER_ID` bullet with the session model; drop `db:seed` from Commands). Commit `feat: anonymous sessions replace the seeded single user`.

### Task 4: Per-request AI provider from the visitor's key

**Files:**
- Modify: `src/server/ai/client.ts`
- Create: `src/server/ai/credentials.ts`, `src/server/ai/credentials.test.ts`
- Modify: `src/server/ai/errors.ts`
- Modify: the 5 AI routes (`writing-sessions`, `exercises` POST, `explanation`, `interview` POST, `interview/.../answer`)
- Modify: `src/lib/responseError.ts`

**Interfaces:**
- Produces:
  - `type AIProviderName = "gemini" | "anthropic"`; `type AICredentials = { provider: AIProviderName; apiKey: string }`
  - `AI_PROVIDER_HEADER = "x-ai-provider"`, `AI_KEY_HEADER = "x-ai-key"`
  - `readAICredentials(headers: Headers): AICredentials | null` — trims; `null` when absent; throws `InvalidAICredentialsError` when provider is unknown, key length > 256, or key has non-printable ASCII.
  - `resolveAICredentials(headers: Headers): AICredentials | null` — header credentials first; else env vars only when `process.env.NODE_ENV !== "production"`.
  - `createAIProvider(credentials: AICredentials): { provider: AIProvider; modelId: string }` (no module cache; replaces `getAIProvider`/`getAIModelId`).
  - Errors (in `errors.ts`): `AIKeyRequiredError`, `InvalidAICredentialsError`, `AIKeyRejectedError` (provider 401/403), `AIQuotaExceededError` (429 quota), `AIProviderUnavailableError` (overload/timeout after fallback). Each carries a stable `code`: `"AI_KEY_REQUIRED" | "AI_KEY_INVALID" | "AI_KEY_REJECTED" | "AI_QUOTA_EXCEEDED" | "AI_UNAVAILABLE"`.
  - `aiErrorResponse(error: unknown): NextResponse | null` — maps those errors to JSON `{ error: <user message>, code }` with statuses 401 (REQUIRED, REJECTED), 400 (INVALID), 429 (QUOTA), 503 (UNAVAILABLE); `null` for anything else. Messages never include the key.
  - `errorMessageFor(response, fallback)` also returns the body `error` for statuses 400/401/429/503 when `code` starts with `AI_`.

- [ ] **Step 1: Failing tests** (`credentials.test.ts`):

```ts
it("trims the key", () => expect(readAICredentials(h({ "x-ai-provider": "gemini", "x-ai-key": "  k1 \n" }))).toEqual({ provider: "gemini", apiKey: "k1" }));
it("returns null without headers", () => expect(readAICredentials(h({}))).toBeNull());
it("rejects unknown provider, oversized and non-printable keys", () => {
  expect(() => readAICredentials(h({ "x-ai-provider": "openai", "x-ai-key": "k" }))).toThrow(InvalidAICredentialsError);
  expect(() => readAICredentials(h({ "x-ai-provider": "gemini", "x-ai-key": "k".repeat(257) }))).toThrow(InvalidAICredentialsError);
  expect(() => readAICredentials(h({ "x-ai-provider": "gemini", "x-ai-key": "k\u0001" }))).toThrow(InvalidAICredentialsError);
});
it("never uses env keys in production", () => { vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("GEMINI_API_KEY", "env"); expect(resolveAICredentials(h({}))).toBeNull(); });
it("maps a rejected key to 401 AI_KEY_REJECTED without echoing the key", async () => {
  const res = aiErrorResponse(new AIKeyRejectedError())!;
  expect(res.status).toBe(401); expect(await res.json()).toMatchObject({ code: "AI_KEY_REJECTED" });
});
```

Add one route-level test (writing-sessions) asserting: no credentials → 401 `AI_KEY_REQUIRED` and **no** `WritingSession` row created.

- [ ] **Step 2:** Run — Expected: FAIL.
- [ ] **Step 3:** Implement. Each provider maps its SDK errors: Gemini `ApiError` status 400 with "API key not valid"/401/403 → `AIKeyRejectedError`; 429 → `AIQuotaExceededError`; Anthropic `AuthenticationError`/`PermissionDeniedError` → rejected, `RateLimitError` → quota. Routes: `resolveAICredentials` → null → `AIKeyRequiredError` **before** any DB write; wrap service call errors with `aiErrorResponse` before the existing 500 fallback. Existing failed-session behaviour (status `failed`, `retrySessionId`) stays for validation errors.
- [ ] **Step 4:** `pnpm check` — Expected: PASS.
- [ ] **Step 5:** Commit `feat(ai): build providers per request from visitor credentials`.

### Task 5: Timeout and overload fallback

**Files:**
- Create: `src/server/ai/resilient.ts`, `src/server/ai/resilient.test.ts`
- Modify: `src/server/ai/client.ts` (`createAIProvider` returns the wrapped provider)

**Interfaces:**
- Consumes: `AIProvider`, error classes from Task 4.
- Produces: `withResilience(primary: AIProvider, fallback: AIProvider, options: { timeoutMs: number }): AIProvider` and `isOverloaded(error: unknown): boolean` (Gemini 503 / `UNAVAILABLE`, Anthropic 529 `overloaded_error` or 503, and the wrapper's own timeout). Constants in `client.ts`: `AI_TIMEOUT_MS = 60_000`; fallback models pinned per provider (`ANTHROPIC_FALLBACK_MODEL = "claude-haiku-5-5"`; Gemini lighter Flash variant — confirm the exact current id in Google's model docs and pin it).
- Behaviour: call primary under timeout; if `isOverloaded` → call fallback once under timeout; if that also overloads → throw `AIProviderUnavailableError`. Rejected-key, quota and validation errors pass through untouched (no retry).

- [ ] **Step 1: Failing tests** with fake providers (`vi.fn()`):

```ts
it("retries once on the fallback when the primary is overloaded", ...)        // primary rejects 503 → fallback result returned
it("does not retry on a rejected key or exhausted quota", ...)                 // fallback not called; same error rethrown
it("times out a hanging call and then uses the fallback", ...)                 // vi.useFakeTimers; primary never resolves; advance 60_000
it("throws AIProviderUnavailableError when both are overloaded", ...)
```

- [ ] **Step 2–4:** Run (FAIL) → implement (`AbortSignal.timeout` is not available to the SDK calls uniformly, so race against a timer and ignore the late result) → run (PASS), `pnpm check`.
- [ ] **Step 5:** Commit `feat(ai): time out slow calls and fall back on overload`.

### Task 6: Postgres-backed rate limits

**Files:**
- Rewrite: `src/server/rateLimit.ts`, `src/server/rateLimit.test.ts`
- Create: `src/server/clientIp.ts` (+ test)
- Modify: every caller of `rateLimitResponse` (5 AI routes) and add limits to `vocabulary` POST/DELETE, `exercises/[id]/attempts` POST, `writing-sessions/[id]` (if it writes)

**Interfaces:**
- Produces:
  - `type LimitRule = { name: string; max: number; windowSeconds: number }`
  - `RATE_LIMITS` constants: `analysis` [{10/60s}, {100/86400s}], `generation` [{5/60s}, {50/86400s}], `write` [{60/60s}], `keyTest` [{5/3600s}], and a per-IP ceiling applied to every bucket: `ip` [{300/86400s}].
  - `consume(prisma, subject: string, rules: LimitRule[], now?: Date): Promise<{ allowed: true } | { allowed: false; retryAfterSeconds: number }>` — one `INSERT … ON CONFLICT ("key","windowStart") DO UPDATE SET count = count + 1 RETURNING count` per rule; key = `${rule.name}:${subject}`; window start = `floor(now / windowSeconds)`.
  - `rateLimitResponse(prisma, request: Request, userId: string, bucket: keyof typeof RATE_LIMITS): Promise<NextResponse | null>` — checks the bucket for the session and `ip` for the hashed IP; 429 with `Retry-After` and `RATE_LIMIT_MESSAGE` (unchanged text).
  - `hashedClientIp(headers: Headers): string` — first entry of `x-forwarded-for`, else `"unknown"`; `sha256(IP_HASH_SALT + ip)` hex, first 32 chars. Raw IP never stored.
  - Expired windows are deleted by the Task 8 cron (rows older than 2 days).

- [ ] **Step 1: Failing tests** (integration): allows `max` calls then blocks with `retryAfterSeconds` ≤ window; a new window allows again (pass `now`); two subjects are independent; `hashedClientIp` never returns the raw IP and is stable for the same input.
- [ ] **Step 2–4:** FAIL → implement → `pnpm check` PASS.
- [ ] **Step 5:** Commit `feat: rate limits shared across instances via Postgres`.

### Task 7: Key page and client key handling

**Files:**
- Create: `src/lib/aiKeyStore.ts` (+ `aiKeyStore.test.ts`, jsdom environment)
- Create: `src/lib/aiFetch.ts`
- Create: `src/app/settings/page.tsx`, `src/components/settings/AIKeyForm.tsx`
- Create: `src/app/api/ai-key/test/route.ts`
- Create: `src/components/settings/KeyRequiredNotice.tsx`
- Modify: `WritingCoach.tsx`, `ExplainCodeCoach.tsx`, `InterviewPractice.tsx`, `ExercisePractice.tsx` (generate), `ExerciseResult.tsx` (explain), `NavLinks.tsx` (add "Key" → `/settings`)

**Interfaces:**
- Consumes: `AI_PROVIDER_HEADER`, `AI_KEY_HEADER`, `AIProviderName` (Task 4); `RATE_LIMITS.keyTest` (Task 6).
- Produces:
  - `getStoredAIKey(): AICredentials | null`, `saveAIKey(c: AICredentials): void` (trims), `clearAIKey(): void` — `localStorage` key `inglesando:ai-key`, every access in try/catch.
  - `aiFetch(input: string, init?: RequestInit): Promise<Response>` — adds the two headers when a key is stored; **throws `MissingAIKeyError` without sending** when none is.
  - `POST /api/ai-key/test` → `{ status: "works" | "invalid" | "busy" }` using one tiny provider call (`continueInterview([])` is acceptable or a dedicated minimal request inside the provider module — do not add an `AIProvider` method for it); limited by `keyTest`; never logs the key.
- UX: when `getStoredAIKey()` is null and the user submits, show `KeyRequiredNotice` in place of the error line — "Set up your AI key to get feedback." with a link "Set up a key" → `/settings`; the typed text stays. `/settings`: provider radio (Gemini recommended), password-type key input, Save & test, Remove; a Gemini step-by-step (EN + PT) linking to Google AI Studio; one line: "On Gemini's free tier Google may use what you send to improve its products — use a paid key or Anthropic for anything sensitive. / No plano gratuito do Gemini, o Google pode usar o que você envia…"; a note that the key stays only in this browser.

- [ ] **Step 1: Failing tests:** `saveAIKey({ provider: "gemini", apiKey: " k \n" })` then `getStoredAIKey()` → `{ provider: "gemini", apiKey: "k" }`; corrupt stored JSON → `null`; `aiFetch` with no key rejects with `MissingAIKeyError` and `fetch` is never called; with a key, headers are present.
- [ ] **Step 2–4:** FAIL → implement → `pnpm check` PASS. Manual: no key → submit on `/write` shows the notice and keeps text; save a real key on `/settings` → "works"; submit → feedback.
- [ ] **Step 5:** Commit `feat: bring-your-own-key settings page`.

### Task 8: Privacy page, delete-my-data, idle cleanup cron

**Files:**
- Create: `src/app/privacy/page.tsx`, `src/components/privacy/DeleteMyDataButton.tsx`
- Create: `src/app/api/me/route.ts` (DELETE)
- Create: `src/app/api/cron/cleanup/route.ts`, `src/server/domain/privacy/cleanup.ts` (+ test)
- Create: `vercel.json` (`crons: [{ path: "/api/cron/cleanup", schedule: "17 3 * * *" }]`)
- Modify: `src/app/layout.tsx` footer (link "Privacy")

**Interfaces:**
- Produces: `deleteUserData(prisma, userId): Promise<void>` (deletes the `User`; cascades cover the rest); `cleanupIdleData(prisma, now: Date): Promise<{ users: number; windows: number }>` — deletes users with `lastActiveAt < now - 90 days` and `RateLimitWindow` rows with `windowStart < now - 2 days`.
- `DELETE /api/me` → deletes data, expires `ig_session`, 204. Client then calls `clearAIKey()` and reloads.
- `GET /api/cron/cleanup` → 401 unless `Authorization: Bearer ${CRON_SECRET}`; returns the counts.
- `/privacy` (EN, then PT): stored = texts, analyses, mistakes, exercises, vocabulary under a random id in a cookie; sent to the chosen AI provider for analysis, with the Gemini free-tier data-use warning stated plainly; never stored = AI keys (they stay in your browser); analytics are cookieless and aggregate; auto-deleted after 90 days without activity; delete button.

- [ ] **Step 1: Failing tests:** cleanup removes a 91-day-idle user and its writing sessions, keeps an 89-day one, removes 3-day-old windows; cron route returns 401 without/with a wrong bearer.
- [ ] **Step 2–4:** FAIL → implement → `pnpm check` PASS.
- [ ] **Step 5:** Commit `feat: privacy page, data deletion and idle cleanup`.

### Task 9: Security hardening

**Files:**
- Modify: `src/proxy.ts` (CSP with nonce), `src/app/layout.tsx` (read `x-nonce` via `headers()` only if needed by inline scripts)
- Modify: `next.config.ts` (`headers()` for non-CSP headers; `poweredByHeader: false`)
- Modify: `.github/workflows/ci.yml` (add `gitleaks/gitleaks-action` pinned by version, and `pnpm audit --prod --audit-level high`)
- Create: `src/server/ai/noKeyInLogs.test.ts`

**Interfaces:**
- CSP (production): `default-src 'self'; script-src 'self' 'nonce-<n>' 'strict-dynamic'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://i.ytimg.com; font-src 'self'; connect-src 'self'; frame-src https://open.spotify.com https://www.youtube-nocookie.com https://www.youtube.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests`. Dev adds `'unsafe-eval'` to `script-src`. (`style-src 'unsafe-inline'` is required by React `style={}` attributes; scripts stay nonce-only.)
- Other headers: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `Strict-Transport-Security: max-age=63072000; includeSubDomains`.

- [ ] **Step 1:** Failing test `noKeyInLogs.test.ts`: spy on `console.error`/`console.warn`, call the writing-sessions route with key `"sk-secret-123"` and a provider fake that throws a generic error; assert no logged argument (stringified) contains `"sk-secret-123"`.
- [ ] **Step 2–4:** FAIL (if any log echoes headers) → fix logs to print only error name/message/code → PASS. Run `pnpm build && pnpm start`, load every route, confirm zero CSP violations in the browser console and Focus Music still plays.
- [ ] **Step 5:** One-off full-history scan: `docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:latest detect --source /repo --log-opts="--all"` — Expected: no leaks. If any real secret is found: stop, rotate it, ask the author before any history rewrite.
- [ ] **Step 6:** Commit `feat(security): CSP, security headers, secret scanning`.

### Task 10: SEO, sharing, analytics

**Files:**
- Create: `src/app/sitemap.ts`, `src/app/robots.ts`, `src/app/opengraph-image.tsx`
- Modify: `src/app/layout.tsx` (`metadataBase` from `NEXT_PUBLIC_SITE_URL` with Vercel's `VERCEL_PROJECT_PRODUCTION_URL` fallback; `<Analytics />`), each route's `page.tsx` (`export const metadata = { title, description }` — title template `%s · Inglesando`)
- Dependency: `@vercel/analytics` (exact pin)

**Interfaces:**
- Sitemap lists only public, content-stable routes: `/`, `/technical`, `/privacy`, `/settings`. `robots` allows all, disallows `/api/`, points to the sitemap.
- OG image 1200×630 in the editorial style: canvas `#faf9f6`, "Inglesando" in Inter 300, one example sentence with a violet underline.

- [ ] **Step 1:** Test `sitemap.test.ts`: contains the 4 URLs and no `/api`. Run FAIL → implement → PASS.
- [ ] **Step 2:** `pnpm build` and fetch `/robots.txt`, `/sitemap.xml`, `/opengraph-image` from `pnpm start` — Expected: 200 each.
- [ ] **Step 3:** Commit `feat: sitemap, robots, metadata, OG image, analytics`.

### Task 11: Motion and the hero specimen

**Files:**
- Modify: `src/app/globals.css` (keyframes `rise-in`, `draw-underline`, `fade-in`; utility classes; `@media (prefers-reduced-motion: reduce)` disables all)
- Create: `src/components/motion/useInView.ts`, `src/components/motion/Reveal.tsx`, `src/components/motion/CountUp.tsx`
- Create: `src/components/home/LiveSpecimen.tsx` (+ `liveSpecimen.ts` data)
- Modify: `src/components/layout/PageHeader.tsx`, `NavLinks.tsx` (sliding underline), `src/app/page.tsx` (hero), `HighlightedText.tsx` + `WritingResults.tsx` (staggered mark drawing), `ProgressSummary.tsx` (CountUp)

**Interfaces:**
- `useInView<T extends Element>(options?): [RefObject<T>, boolean]` — `IntersectionObserver`, fires once.
- `<Reveal delay?: number>` — renders children visible; adds the reveal class only after hydration (content never hidden without JS).
- `<CountUp value: number>` — counts once on first view; renders the final value for SSR and reduced motion.
- `LiveSpecimen` — labelled "Example", a 2–3 sentence paragraph with 3 realistic Portuguese-speaker mistakes (e.g. "I have 25 years", "explain me", "depend of"), each drawing its violet underline then showing the numbered correction; loop ~8s with a 2s pause; static final frame under reduced motion; `aria-hidden` animation layer with a plain-text accessible version.
- Timing: page header stagger 0/80/160ms, 400ms ease-out (`cubic-bezier(0.16, 1, 0.3, 1)`); marks 300ms each, 120ms apart.

- [ ] **Step 1:** Test `liveSpecimen.test.ts`: every mistake span in the data occurs verbatim in the paragraph (so the highlighter can find it). FAIL → implement → PASS.
- [ ] **Step 2:** `pnpm check`; then screenshots at 390px and 1440px of `/` (mid-animation and final) and a results page; confirm with reduced motion emulated that nothing moves.
- [ ] **Step 3:** Commit `feat: soft motion and a live specimen hero`.

### Task 11b: Logo

**Files:**
- Create: `src/components/brand/Logo.tsx` (inline SVG component: `<LogoMark />` and `<Logo />` = mark + wordmark), `src/app/icon.svg`, `src/app/apple-icon.png` (180×180, rendered from the SVG with `magick`), `public/logo.svg`
- Delete: `src/app/favicon.ico` (replaced by `icon.svg`)
- Modify: `src/components/layout/SiteHeader.tsx` (use `<Logo />`), `src/app/opengraph-image.tsx` (use the mark), `README.md` header (Task 12 uses `public/logo.svg`)

**Interfaces:**
- Produces: `Logo({ className?: string })`, `LogoMark({ className?: string; title?: string })`.
- Design, authored by hand as SVG (no image generation): a proofreader's mark as the identity — a lowercase "i" (Inter 300 weight feel, drawn as paths, not a font dependency) whose tittle is a small violet `#0007cb` square and which sits on a short violet underline stroke, echoing the mistake marks of the proofed page. Ink `#111111` on transparent. Wordmark "Inglesando" in Inter 300 with -0.03em tracking set as text in `<Logo />` (not outlined), mark height = cap height × 1.3. Must read at 16px (favicon) — check by rendering 16/32/180px PNGs with `magick` and viewing them. Violet appears only in the mark (consistent with "violet is rare").

- [ ] **Step 1:** Draw the SVG; render 16, 32, 180, 512px previews into the plan workspace and inspect.
- [ ] **Step 2:** Wire header, icons, OG image. `pnpm check && pnpm build`.
- [ ] **Step 3:** Commit `feat: logo and favicon`.

### Task 12: Repository ready to be public

**Files:**
- Rewrite: `README.md` (what it is; screenshot desktop + mobile in `docs/screenshots/`; how the mistake loop works; stack; run locally incl. Docker and a free Gemini key; deploy your own; architecture map; privacy stance; link to `SPEC.md`, `DESIGN.md`, `CONTRIBUTING.md`)
- Create: `LICENSE` (MIT, © 2026 levyrodrigues23), `SECURITY.md` (report privately via GitHub Security Advisories; what's in scope)
- Modify: `.env.example` (final variable list with comments), `.gitignore` (`.impeccable/` except `surfaces/`, `graphify-out/`)
- Modify: `SPEC.md` (§2 target user and §4 auth row: anonymous sessions + BYOK replace single-user/server key), `CLAUDE.md` (session model, BYOK, rate limits, proxy, env vars)
- Keep `.agents/` and `skills-lock.json` (referenced by `CLAUDE.md` as agent docs); mention them in README's contributing section.

- [ ] **Step 1:** Write the files. `pnpm check`.
- [ ] **Step 2:** Self-check: `git ls-files | grep -iE "\.env$|secret|\.pem"` returns nothing; no personal email in tracked files (`git grep -n "example.com"` empty after `seed.ts` removal).
- [ ] **Step 3:** Commit `docs: prepare the repository to go public`. Open PR to `develop`; after merge, release `develop` → `main`.

### Task 13: Deploy guide, deploy, go public

**Files:**
- Create: `docs/deploy.md` (Portuguese)
- Modify: `package.json` (`"vercel-build": "node scripts/vercel-build.mjs"`), create `scripts/vercel-build.mjs` (runs `prisma migrate deploy` only when `VERCEL_ENV === "production"`, then `next build`)

- [ ] **Step 1:** Write `docs/deploy.md` for the author: create Vercel account with GitHub → import `levyrodrigues23/inglesando` (production branch `main`) → Settings › Git: disable preview deployments → Storage › Create Database › Postgres (Marketplace, free plan, connect to Production) → Environment Variables: `SESSION_SECRET`, `IP_HASH_SALT`, `CRON_SECRET` (with a one-line command to generate each: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`) → Analytics › Enable → Deploy. No AI keys are set.
- [ ] **Step 2:** Author performs the guide. Then smoke test on the live URL: new visitor cookie set; `/write` without key shows the notice; key saved on `/settings` tests "works"; write → proofed page; exercises; delete-my-data clears everything; response headers include the CSP; `/robots.txt` and `/sitemap.xml` 200; cron route returns 401 without the secret.
- [ ] **Step 3:** Author switches the GitHub repository to Public (Settings › General › Danger Zone) only after Step 2 passes. Commit any guide fixes.
