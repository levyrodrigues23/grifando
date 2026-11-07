# Public deploy — design

Status: draft for approval · Date: 2026-11-07 · Owner: @levyrodrigues23

## Intent

Put Inglesando on the internet (Vercel) so friends can use it, and make the GitHub repository
public as a portfolio piece. The repo must read well on its own: clear README, clean tree, no
secrets, sensible security. The author does **not** want their own AI key powering the site,
does **not** want a login system, and wants to stay light on LGPD obligations.

Success, from the author's side:

- A friend opens the URL, reads what the app does (a live specimen on the home page), pastes
  their own free Gemini key on a key page, writes, and gets the proofed-page feedback.
- The author pays nothing for AI and nothing for hosting at friends-scale.
- Someone browsing the public repo understands what the app is, how it works, and how to run
  it locally — and finds nothing embarrassing or dangerous in it.
- The site no longer feels static: soft, purposeful motion.

## Goals

1. **Bring your own key (BYOK).** Each visitor configures their AI provider and key in the
   browser. The server holds no AI key in production.
2. **No login.** Anonymous sessions instead of accounts.
3. **Hosted Postgres** on Vercel (Marketplace integration, free tier). Keep the database — the
   whole domain (patterns, recall, mastery, streak) is built on it.
4. **Abuse protection** for server and database (rate limits), now that AI cost is the
   visitor's own.
5. **Resilient AI calls**: timeout, one retry on overload, clear messages.
6. **Privacy basics**: privacy page, "delete my data", automatic cleanup of idle sessions.
7. **Security hardening** suitable for a public repo and a key stored in the browser.
8. **SEO/share basics**: sitemap, robots, per-page metadata, Open Graph image.
9. **Privacy-friendly analytics.**
10. **Motion and a live hero specimen.**
11. **Repo ready to be public**: README, license, security policy, cleanup.
12. **Release first**: ship `develop` → `main`, test end to end by hand, close the issues.

## Non-goals

- Accounts, email, OAuth, password reset, cross-device sync.
- Paid tiers, billing, a shared server-side AI key.
- A Redis/KV service (see trade-offs).
- Translating the UI to Portuguese (stays English; Portuguese inside explanations as today).
- New learning features.

## Anti-goals (failure even if it "works")

- An AI key — the author's or a visitor's — ever stored in the database, written to a log,
  sent to analytics, or committed to git.
- A stranger being able to make the author pay anything.
- Visitors losing a text they wrote because an AI call failed (the current "text has not been
  lost" guarantee must hold).
- Motion that makes the app feel slower or busier, or that ignores reduced-motion settings.
- A public repo containing personal tooling clutter, secrets in history, or stale docs that
  contradict the code (e.g. CLAUDE.md describing the old dark theme).

## Constraints

- Stack and pins in `CLAUDE.md` stay (Next 16, Prisma 7.10.0, TS 5.9.3, ESLint 9, pnpm).
- Architecture rules stay: UI → thin routes → domain services → repositories → Prisma; all AI
  through `AIProvider`; every AI response Zod-validated; fetch callers check `response.ok`.
- Every domain table already carries `userId`; anonymous sessions plug in by replacing the
  `DEFAULT_USER_ID` constant lookup, not by migrating data (the MVP was designed for this).
- Vercel functions are stateless and multi-instance: no in-memory state can be trusted across
  requests (affects the current in-memory rate limiter and the cached `getAIProvider()`).
- The author does the account-bound steps (Vercel account, importing the repo, creating the
  database, setting env vars). Everything else is code.
- The redesign (PR #47) is already merged into `develop`; this work builds on its tokens
  (`DESIGN.md` is the source of truth for visual rules).

## Decisions

### Decided by the author

| Topic | Decision |
|---|---|
| Audience | Friends; site open to anyone who finds the repo. |
| Login | None. |
| AI key | Visitor brings their own; dedicated key page. Author's key never used in production. |
| No key | Visitor can browse everything; on submitting any AI action they get a message telling them to set a key first, linking to the key page. |
| Database | Keep Postgres, hosted. |
| Hero | Animated "live specimen" of the product (option 2), not a photo/illustration. |
| Motion | Add soft, purposeful motion across the site. |

### My calls (author may veto)

| Topic | Call | Why |
|---|---|---|
| Identity | Anonymous session: random id in an `httpOnly`, `Secure`, `SameSite=Lax`, signed cookie (HMAC with `SESSION_SECRET`), ~1 year. User row created lazily on first write. | No PII collected; reuses existing `userId` columns. |
| Key storage | `localStorage` in the visitor's browser, keyed by provider; sent per request in a header (`x-ai-provider`, `x-ai-key`) over HTTPS; server builds a provider per request and drops the key after. | Server never persists the key; `sessionStorage` would force re-entry every tab. |
| Key validation | On save, a cheap server-side test call; show "works" / "invalid" / "provider busy, saved anyway". | Catches typos before the first real submission. |
| Providers offered | Gemini (recommended, free key, step-by-step guide) and Anthropic. Model chosen server-side per provider. | Matches the two existing providers. |
| Local dev | Env-var keys keep working as a fallback **only when `NODE_ENV !== "production"`**. | Author keeps local dev convenience; production can't silently use a server key. |
| Rate limiting | Postgres-backed fixed-window counters, keyed by session id **and** by IP (hashed), on AI routes and write routes. | One fewer service; volume is tiny. Redis only if contention ever shows up. |
| AI resilience | Per-call timeout ~60s; on provider overload (503/429-overloaded) retry once with that provider's lighter model using the same key; then a clear message. Text is never lost. | Today's 4-minute hang and 503 failure. |
| Data deletion | "Delete my data" on the privacy page: removes every row for the session's `userId`, clears the cookie, and clears the stored key. | LGPD-friendly, no support burden. |
| Retention | Daily Vercel Cron deletes users inactive for 90 days. | Bounded data, free-tier friendly. |
| Analytics | Vercel Web Analytics (cookieless, no personal data). No custom events with user text. | Matches the low-LGPD stance. |
| Security headers | CSP (no inline scripts beyond what Next requires via nonce/hash; `connect-src 'self'`), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors 'none'`. Focus Music's Spotify/YouTube iframes stay allowed in `frame-src`. | A key in `localStorage` is only as safe as the site's XSS posture. |
| Logging | A single scrubber so request headers carrying keys are never logged; AI provider errors logged without request bodies. | Anti-goal #1. |
| Interface copy | English, plus the privacy page and key guide also in Portuguese (short). | Audience is Brazilian; legal-ish text should be readable. |
| License | MIT. | Common default for a portfolio repo. |
| Motion library | CSS transitions/keyframes + a tiny `IntersectionObserver` hook; no animation dependency. | Small bundle; enough for fades, staggers, underline drawing. |

## The how, by part

### 1. Release and baseline
Release `develop` → `main`; manual end-to-end pass, run locally with the author's own key
(before BYOK exists), of every route with a real
key (write → proofed page → exercises → explain my answer → mistakes → vocabulary → interview
→ today); close issues #3–#23 that shipped: the builder checks each issue's acceptance criteria
against the code and lists any that fall short instead of closing them; close the epic #8 when
all its children are closed.

### 2. Anonymous sessions
Replace `DEFAULT_USER_ID` lookups with a `getCurrentUserId()` resolver (server-only) that reads
or creates the signed session cookie. Every route handler and server page uses it. Seed script
keeps working for local dev. Tests cover: new visitor gets a cookie, tampered cookie is
rejected and replaced, two sessions never see each other's data.

### 3. Bring your own key
- `/settings` (key page): provider choice, key field (password-type, paste-friendly), save /
  test / remove, the Gemini step-by-step guide, and a plain note on where the key lives.
- Client helper attaches the key headers to AI calls; components show the "set a key first"
  message (with link) when none is stored, before any request is made.
- Server: `getAIProvider()` becomes `createAIProviderFor(request)` (no module-level cache);
  missing key → typed error → 401-ish response with a stable error code the UI maps to the
  "set a key" message. Production refuses env-var keys.

### 4. AI resilience
Timeout + one overload retry on a lighter model per provider, implemented once around the
provider (both Gemini and Anthropic). Existing PENDING/failed-session behaviour stays.

### 5. Rate limiting
Replace the in-memory limiter with a Postgres-backed one (new table + migration), same
`rateLimitResponse` call sites, keyed by session and hashed IP. Limits are constants in one
place.

### 6. Privacy
`/privacy` page (EN + PT): what is stored (texts, mistakes, exercises, vocabulary under a
random id), what is sent to the AI provider, what is never stored (keys), retention (90 days
idle), delete button. Footer link.

### 7. Security
Headers in `next.config.ts` (or middleware for CSP nonce), log scrubbing, secret scan of full
git history (gitleaks or equivalent) before going public, `SECURITY.md`, dependency audit in CI.

### 8. SEO and sharing
`src/app/sitemap.ts`, `src/app/robots.ts`, per-route `metadata`, an Open Graph image in the
editorial style (`opengraph-image.tsx`). Private/dynamic routes excluded from the sitemap.

### 9. Analytics
`@vercel/analytics` in the root layout. Nothing else.

### 10. Motion and the hero specimen
- Home hero: a short English sample paragraph with typical Portuguese-speaker mistakes; violet
  underlines draw in one by one, numbered marks appear, corrections fade in beside them, slow
  loop with a pause. Clearly a demo (labelled "Example"). Static final frame under
  `prefers-reduced-motion`.
- Page entrance: headline and standfirst fade + rise slightly, short stagger, once per
  navigation.
- Sections reveal with a fade as they enter the viewport.
- Proofed page (real results): the same mark-drawing sequence as the hero, then notes appear.
- Details: nav underline slides between tabs; progress figures count up once; button hover
  states.
- All motion: ease-out, ≤ 400ms per element, content visible without JS, reduced-motion
  respected. No motion on content the user is typing in.

### 11. Repo ready to be public
- README rewrite: what it is, screenshots (desktop + mobile), how the mistake loop works, stack,
  run locally, get a free Gemini key, deploy your own, architecture map, privacy stance.
- `LICENSE` (MIT), `SECURITY.md`, `.env.example` updated (`SESSION_SECRET`, dev-only keys).
- Clean tree: decide on `.agents/` and `skills-lock.json` (tooling for coding agents — keep only
  if useful to readers, otherwise remove), keep `.impeccable/` and `graphify-out/` out of git,
  make sure `CLAUDE.md`/`DESIGN.md`/`SPEC.md` match the code (SPEC still describes a
  single-user MVP).
- Issue/PR templates already in `CONTRIBUTING.md` flow — check they read well publicly.

### 12. Deploy
A guide (`docs/deploy.md`, PT) for the author's clicks: create Vercel account with GitHub,
import repo, Storage → create Postgres (Marketplace, free), add `SESSION_SECRET`, enable
Web Analytics, set the cron. Build runs `prisma migrate deploy` before `next build`. Then a
smoke test on the live URL.

## Trade-offs (summary)

| Choice | Gain | Cost |
|---|---|---|
| BYOK | Author pays nothing; no shared key to leak | Friends must create a key (2 min); key sits in the browser |
| Anonymous sessions | No login, minimal LGPD | Clearing cookies / new device = history gone |
| Postgres rate limits | No extra service | A few extra queries per AI call |
| Open to anyone | Easy sharing | Needs rate limits + CSP; can't stop a determined spammer from filling the DB beyond limits |
| CSS-only motion | No dependency | Hand-rolled sequencing for the specimen |

## Left to the builder

- Exact limit numbers, timeouts, lighter-model ids per provider (pin explicit versions).
- Cookie and header names, table name for counters.
- Exact specimen copy (must be realistic Portuguese-speaker mistakes, labelled as example).
- How CSP is implemented (static headers vs nonce middleware), as long as it holds.
- Ordering of parts 2–11 inside the plan, as long as Release is first and Deploy last.

## Builder-check resolutions (my calls unless marked)

- **Branches and environments**: Vercel production deploys from `main`. Every later part ships
  through `develop` → `main` releases. Preview deployments are turned off for this project (no
  database is attached to previews), so no branch can touch the live schema;
  `prisma migrate deploy` runs only when `VERCEL_ENV=production`.
- **Anonymous `User` rows**: a schema migration makes `User.email` and `User.displayName`
  nullable and adds `lastActiveAt` (indexed). Existing data is untouched; the seeded local user
  keeps its values. "Activity" means writes (any AI action, exercise attempt, vocabulary
  change); `lastActiveAt` is bumped by the session resolver at most once per hour. The 90-day
  cleanup deletes users whose `lastActiveAt` is older than 90 days, cascading to their rows.
- **Cookie minting**: a `src/proxy.ts` (Next 16 proxy) mints the signed session cookie on the
  first request that lacks a valid one, and also issues the per-request CSP nonce. Server
  Components only read the cookie; a missing or invalid id there resolves to an "empty"
  visitor with no rows.
- **Secret scan**: the author's `.env` was never committed (checked). If the scan finds any
  other real secret, work stops: rotate the key, then ask the author before any history
  rewrite. The author flips the repo to public **after** the live deploy passes its smoke test.
- **Key-test endpoint**: rate-limited separately and tighter (e.g. 5 per hour per session and
  per IP), never logs the key, and returns only works / invalid / busy.
- **Env vars for the deploy guide**: `DATABASE_URL` (set by the Marketplace integration),
  `SESSION_SECRET`, `IP_HASH_SALT`, `CRON_SECRET`.
- **Rate limiter**: switching from the current in-memory token bucket to Postgres fixed windows
  is an accepted behaviour change.

## Author answers

- **AI data use disclosure** (author): stated plainly, not buried. The privacy page and the key
  guide say that on Gemini's free tier Google may use submitted text to improve its products,
  and recommend a paid Gemini key or an Anthropic key for anything sensitive; the key page
  repeats a one-line version next to the provider choice. The author's priority is minimizing
  leak risk: when a security choice trades convenience for safety, take safety.

## Open questions

None.
