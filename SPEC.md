# SPEC — Inglesando (personal AI English coach)

## 1. Purpose

A personal web application that helps a Portuguese-speaking software developer improve their
English through active writing practice. The application is not a generic grammar checker and
not a chat window in front of an LLM. Its defining behavior is:

> It learns from the user's actual mistakes and progressively builds personalized practice
> from them.

The learner writes, gets structured feedback that distinguishes *incorrect* from *unnatural*
from *natural* English, and the system turns recurring mistakes into future exercises,
tracked over time.

## 2. Target user (MVP)

- A Brazilian Portuguese-speaking software developer learning English. The app is public:
  anyone can use it, with no signup or login. Each browser gets an anonymous signed-cookie
  session (`ig_session`), and every record is scoped by that session's `userId`. A user with
  no activity for 90 days is deleted by a daily cleanup job, and a visitor can delete their
  own data at any time (`DELETE /api/me`). No email or other PII is collected.
- AI is bring-your-own-key: each visitor stores a Google Gemini or Anthropic key in their own
  browser (`/settings`) and it is sent per request in headers; the server holds no AI key in
  production.
- Interface language: English, with Portuguese used inside explanations where it clarifies a
  concept (e.g. explaining why a literal translation from Portuguese fails). All practice
  content itself is in English.
- The user writes code professionally, so a meaningful share of practice content is
  technical/developer English (code explanations, PR descriptions, interview answers,
  architecture explanations).

## 3. Product philosophy (behavioral contract)

The application must:

- Require the user to write first. Never present a "correct my text" button as a standalone,
  learning-free action — every correction is attached to an explanation and, over time, to
  exercises that make the user retrieve the correct form themselves.
- Distinguish three tiers of writing quality, not two:
  1. **Incorrect** — a grammar/vocabulary/mechanics error.
  2. **Correct but unnatural** — grammatically valid, but not how a fluent speaker would say it.
  3. **Correct and natural** — no change needed.
- Preserve the user's original intent. Corrections stay close to what the user wrote; the
  "natural version" is offered as a separate, clearly-labeled alternative phrasing, not a
  claim that it's the only right answer.
- Track recurring mistakes as patterns, not as an unbounded list of raw occurrences.
- Turn weak patterns into targeted exercises that require active recall (answer before
  reveal) rather than passive reading of corrections.
- Report progress honestly. LLM-derived scores are presented as *heuristic, model-generated
  signals*, never as validated CEFR levels or standardized test scores.

## 4. Tech stack

Decided after inspecting the repository (was empty) and evaluating current stable,
mutually-compatible versions as of 2026-09-14.

| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) | `next@16.4.5` |
| Language | TypeScript | Pinned to `5.9.3`, **not** the new TS 7 line — `typescript-eslint@8.x` only supports `<6.1.0`; TS7 would break linting today. |
| UI | React 19 + Tailwind CSS 4 + shadcn/ui | `react@19.3.0`, `tailwindcss@4.3.3` |
| Database | PostgreSQL via Docker Compose (local dev) | |
| ORM | Prisma | Pinned to `7.10.0` for both `prisma` and `@prisma/client` — `prisma@latest` currently resolves to an `8.0.0-rc`, which is not stable. |
| Validation | Zod 4 | `zod@4.6.7`, used for both DB-adjacent input validation and AI structured-output validation |
| Testing | Vitest | `vitest@5.0.0` |
| AI provider | Gemini or Anthropic Claude, visitor's own key | Behind `AIProvider`; models configurable, one fallback model on overload |
| Package manager | pnpm | already available locally (`12.3.4`) |
| Auth | Anonymous sessions | No login. A signed `ig_session` cookie (minted in `src/proxy.ts`) identifies the browser; `userId` foreign keys everywhere. AI access is BYOK: the visitor's key travels in `x-ai-provider`/`x-ai-key` headers and is never stored server-side. |

The AI provider sits behind a small `AIProvider` interface (see §9) so switching providers
later touches one adapter, not the domain layer.

## 5. Core features

### 5.1 Writing Coach (central feature)

The user picks what to write — free writing, the daily challenge, a Technical English prompt,
Explain Code, or an interview answer — writes in a plain-text editor, and submits.

Writing modes (decision, #5): GitHub issues, PR descriptions, READMEs, code-review comments and
similar developer genres are **Technical English prompts** (`technicalPrompts.ts`), not separate
`PromptType` values. They share one analysis pipeline, the prompt text already tells the model
what genre it is reading, and a dedicated mode per genre would add a migration, a selector and
prompt branches without changing the feedback. Revisit only if genre-specific scoring (e.g.
"does this PR description have a summary and a test plan?") becomes a real need.

One structured AI call analyzes the submission and returns:

- a corrected version (minimal changes, same intent),
- a natural version (how a fluent speaker would phrase the same idea — may diverge more),
- overall feedback (short, plain-language summary),
- four 0–100 heuristic scores: grammar, vocabulary, clarity, naturalness,
- a list of individual mistakes, each with: the offending span, the correction, a category,
  a plain explanation, an example sentence using the same pattern, and a severity tier
  (`error` vs `unnatural`), plus a machine-generated `patternKey` used for deduplication
  (see §6).

The UI shows original vs. corrected with inline highlighting of changed spans, each
highlighted span linked to its explanation card below (click/hover to connect them — this
was chosen over a full diff view or a separate annotation sidebar because it keeps everything
in one reading flow and works at MVP scope; a diff-style view can be revisited later if the
inline approach feels cramped for longer texts). The natural version is shown in a separate,
clearly labeled panel so it's never confused with "the one correct answer."

Every mistake in the response is persisted and folded into the user's mistake patterns
(§6). Not every trivial mistake becomes a permanent, isolated record — see deduplication.

### 5.2 Mistake Notebook

A browsable, searchable list of the user's `MistakePattern` records: category, canonical
example (original → correction), how many times it has occurred, when it last occurred, and
a mastery indicator (`active` → `improving` → `mastered`, driven by exercise performance, not
self-report).

### 5.3 Mistake analytics

A simple breakdown (bar list, not a BI dashboard) of mistake frequency by category over a
selectable window (all-time / last 30 days), enough to answer "what should I actually work
on," with no separate analytics infrastructure.

### 5.4 Personalized exercises

Generated from the user's actual `MistakePattern` records, weighted toward high-frequency and
low-mastery patterns. Four exercise types for the MVP:

- multiple choice (pick the correct sentence),
- fill in the blank,
- rewrite (transform an unnatural/incorrect sentence),
- guided translation (PT→EN, explicitly targeting one known weak pattern).

Flow enforces active recall: exercise shown → user answers → answer evaluated → explanation
shown → optional retry. The correct answer is never shown before an attempt.

An `ExerciseAttempt` outcome nudges the related `MistakePattern`'s mastery level up (correct)
or resets progress toward `active` (incorrect on a pattern previously marked `improving`).

### 5.5 Daily Writing

A single daily challenge prompt (from a curated static prompt bank for MVP, biased toward the
user's weak categories when possible) shown on the dashboard. Answering it is just a Writing
Coach submission with `promptType = DAILY_CHALLENGE` — no separate correction pipeline.

### 5.6 Technical English mode

Writing Coach submissions tagged with a technical category (backend, frontend, devops,
databases, cloud, architecture, algorithms, testing, git, github, code-review, security, ai,
system-design). Prompt bank includes developer-specific tasks ("write a PR description",
"explain this SQL query", "describe a bug you fixed"). Reuses the Writing Coach pipeline —
category is just prompt metadata, not a separate feature.

### 5.7 Explain Code in English

The user pastes a small code snippet (hard length cap, see §11) and is asked to explain what
it does, in English. Their explanation is run through the same Writing Coach pipeline with an
added system-prompt instruction: focus feedback on the English, not on the code's correctness.
This is a language-learning feature, not a code review tool — the AI is not asked to evaluate
whether the code itself is good.

### 5.8 Interview Practice

A text-based, turn-based simulation: the AI asks a software engineering interview question,
the user answers in English, the answer is scored (grammar, vocabulary, clarity, naturalness,
*and* technical-communication clarity as a fifth dimension specific to this mode), and the AI
asks a natural follow-up. Conversation state (question list + answers) is persisted per
session. No voice; text only for MVP.

### 5.9 Progress dashboard

Shows: today's challenge, a recent writing session or two, current weak categories (from
analytics), a short list of recent mistakes, one practice recommendation (the single
highest-priority pattern to drill), and a small trend (e.g. average scores over the last N
sessions). Explicitly capped at a small number of cards — this is a working dashboard, not a
BI tool.

### 5.10 Vocabulary (post-MVP)

Schema included now (`VocabularyItem`) so no migration churn is needed later, but the
feature (saving/reviewing interesting words found during sessions) ships after the MVP.

## 6. Mistake deduplication & mastery model

This is the part of the domain model that most needs to be right, because "one mistake made
ten times" must not become ten disconnected rows.

- **`MistakeOccurrence`** — one row per individual mistake found in one `WritingAnalysis`.
  Immutable, cheap, always written. Holds the raw span, correction, explanation, example, and
  category exactly as returned for that submission.
- **`MistakePattern`** — one row per *recurring concept*, scoped to `(userId, category,
  patternKey)`. `patternKey` is a short machine-readable slug the AI is asked to produce as
  part of the structured response (e.g. `verb-plus-gerund:difficulty`, `preposition:depend`),
  normalized on write (lowercased, trimmed, non-alphanumeric collapsed to `-`, capped length).
  Every new `MistakeOccurrence` upserts its pattern: increments `occurrenceCount`, updates
  `lastSeenAt`, and stores a canonical example pair for display in the Notebook.
  - Why an AI-proposed key instead of clustering text ourselves: it avoids building fuzzy
    string-matching/embedding infrastructure for an MVP, and the model already understands
    the grammatical concept behind a mistake far better than a naive text similarity metric
    would. The tradeoff (accepted for MVP): key quality depends on the model being
    consistent, so occasional near-duplicate patterns are possible; the Notebook is a simple
    read path, so a future "merge patterns" admin action is a cheap fix if this becomes
    annoying, but is explicitly not built for MVP.
  - Trivial one-off typos (category `spelling` with no repeat within a rolling window) are
    still recorded as an `Occurrence` for the session's history, but do not need to surface
    prominently in the Notebook — the Notebook view filters/sorts by `occurrenceCount` and
    recency so noise sinks rather than being deleted (nothing is silently discarded).
- **Mastery** lives on `MistakePattern.masteryLevel` (`active | improving | mastered`), driven
  only by `ExerciseAttempt` results targeting that pattern — never by the user just reading a
  correction. Two consecutive correct attempts move `active → improving`; a further two move
  `improving → mastered`; any incorrect attempt on an `improving` pattern drops it back to
  `active`. `mastered` patterns are deprioritized (not deleted) in future exercise selection.
- **Decay (retention phase, §6.1)**: `mastered` is not terminal. A mastered pattern drops back
  to `improving` when its estimated recall probability falls below a threshold, or when the
  same mistake reappears in a new piece of writing.

### 6.1 Retention engine (post-MVP phase — epic #8)

Planned from `docs/research/duolingo.md` (Part A has the full mapping to this codebase). The
memory model is borrowed from Duolingo's published research; the habit mechanics are kept
deliberately light. Success is measured as patterns mastered *and kept* mastered, never XP.

- **Half-life per pattern** (Half-Life Regression, simplified): recall probability
  `p = 2^(-Δ/h)`, Δ = days since the pattern was last practiced, `h` estimated from the
  pattern's seen/correct/incorrect counters only — no per-pattern difficulty weights (they
  overfit in Duolingo's own experiments, and one user has no data to fit them).
- **Review queue**: practice selection orders patterns by lowest recall probability first.
- **Mixed daily session**: one writing prompt interleaved with review exercises for due
  patterns.
- **Target difficulty**: an Elo-style ability estimate per mistake category and a difficulty
  per exercise, aiming generated exercises at ~70% expected success.
- **Feedback on attempts**: a deterministic diff against the closest acceptable answer, plus
  an optional AI "explain my answer" call that never affects grading.
- **Mastery check**: reaching `mastered` requires an unscaffolded exercise (free rewrite or
  translation), not only multiple choice.
- **Habit**: a low-bar daily streak (any one activity counts) with limited rest days; no
  punishment mechanics, no leaderboards.
- **No reminders (decision, #20)**: the app runs on the learner's own machine with no
  always-on server, so it has no channel to remind from. Web Push needs a running server to
  send at the right time plus a service worker and VAPID keys; email needs SMTP credentials
  and a scheduler. Both are infrastructure the app doesn't have yet, for a nudge the streak on
  the dashboard already gives when the app is opened. Revisit together with deployment.

## 7. Data model (Prisma, conceptual)

```
User
  id, email, displayName, nativeLanguage, createdAt

WritingSession
  id, userId, promptType (FREE | DAILY_CHALLENGE | TECHNICAL | EXPLAIN_CODE | INTERVIEW | ...)
  promptText (nullable — null for free writing)
  technicalCategory (nullable enum — backend/frontend/devops/... )
  originalText
  status (PENDING | ANALYZED | FAILED)
  createdAt

WritingAnalysis (1:1 with WritingSession)
  id, sessionId, correctedText, naturalText, overallFeedback
  grammarScore, vocabularyScore, clarityScore, naturalnessScore
  modelId, createdAt

MistakeOccurrence
  id, analysisId, patternId
  originalSpan, correctedSpan, category, severity (ERROR | UNNATURAL)
  explanation, example, createdAt

MistakePattern
  id, userId, category, patternKey (unique per userId+category+patternKey)
  exampleOriginal, exampleCorrection, occurrenceCount
  masteryLevel (ACTIVE | IMPROVING | MASTERED)
  firstSeenAt, lastSeenAt
  correctCount, incorrectCount, lastPracticedAt   (recall history for the half-life, §6.1)

Exercise
  id, userId, type (MULTIPLE_CHOICE | FILL_BLANK | REWRITE | TRANSLATION)
  sourcePatternId (nullable), promptData (JSON: shape depends on type, Zod-validated)
  difficulty (nullable Int 1-5 — target level requested from the generator, §6.1)
  createdAt

ExerciseAttempt
  id, exerciseId, userAnswer, isCorrect, feedback, attemptedAt

InterviewSession
  id, userId, status (ACTIVE | ENDED), createdAt
InterviewTurn
  id, interviewSessionId, question, userAnswer (nullable until answered)
  writingAnalysisId (nullable — reuses WritingAnalysis for scoring), order

CategoryAbility   (Elo-style ability per mistake category, §6.1)
  id, userId, category (unique per userId+category), rating, attemptCount, updatedAt

VocabularyItem   (schema only in MVP, feature post-MVP)
  id, userId, term, meaningPt, exampleSentence, sourceSessionId (nullable), createdAt
```

Key relationships: one `WritingSession` → at most one `WritingAnalysis` → many
`MistakeOccurrence` → each occurrence links to exactly one `MistakePattern`. Patterns are
the durable, queryable unit for analytics/exercise-selection; occurrences are the audit trail.

## 8. Non-MVP (explicitly out of scope for now)

Voice/speech recognition, pronunciation scoring, multiplayer/social features (leaderboards,
friend streaks), native mobile app, complex gamification (XP economies, badges, currencies —
the simple streak in §6.1 is in scope), browser extension, multi-user auth/signup,
deployment/hosting setup beyond local Docker Compose.

Moved into scope after the MVP (tracked in the retention epic, #8): spaced repetition on
mistake patterns and the rest of §6.1. Vocabulary review (§5.10, #7) is still pending and
will reuse the same half-life and review queue rather than a scheduler of its own.

## 9. AI architecture

```
src/server/ai/
  provider.ts            // AIProvider interface: analyzeWriting(), generateExercises(), continueInterview()
  providers/anthropic.ts // Claude implementation of AIProvider
  prompts/*.ts            // plain functions building prompt strings/messages, easy to inspect/edit
  schemas/*.ts            // Zod schemas for every structured AI response
```

- All AI calls request structured (tool-use/JSON) output validated against a Zod schema
  before anything touches the database.
- If validation fails: the raw text is never persisted as if it were valid data. The service
  returns a typed failure result; the API layer surfaces "we couldn't analyze this writing
  right now, your text has not been lost" and the original `WritingSession` stays `PENDING`
  with the raw text intact so the user can retry without re-typing.
- One structured call per writing submission (not one call per mistake, not separate calls for
  corrected vs. natural text) to keep latency and cost sane.
- Exercise generation batches multiple exercises (e.g. 3–5) targeting the current weak
  patterns in a single call rather than one call per exercise.

## 10. Testing strategy

- Unit tests (Vitest): Zod schema validation (valid + malformed AI responses), mistake
  pattern upsert/normalization logic, mastery transition logic, exercise-selection weighting,
  scoring-adjacent pure functions.
- Integration tests: repository layer against a real Postgres (via Docker Compose, a
  dedicated test database/schema), writing-submission flow with the AI boundary mocked.
- No tests assert exact LLM prose. AI-dependent tests mock `AIProvider` and assert on service
  behavior (persistence, error handling, pattern updates), not on generated text content.

## 11. Security & abuse limits (MVP-appropriate, not enterprise)

- Input caps: writing submissions capped (~5,000 characters), pasted code for Explain Code
  capped (~2,000 characters) — enforced both client-side and server-side (Zod).
- All AI-facing API routes validate input shape/size before calling the model.
- No secrets logged. Visitors' AI keys are never persisted, logged, or sent to analytics;
  server secrets come from environment variables, never committed (`.env.example` provided,
  `.env` gitignored). Env-var AI keys are a local-development convenience only; production
  never uses them.
- Rate limiting on AI-calling routes, per user and per hashed IP, in Postgres fixed windows
  (`RateLimitWindow`) so limits hold across serverless instances.
- The "current user" is resolved from the verified signed session cookie
  (`getCurrentUserId()`), never taken from client input, so nothing in the request can spoof
  a different user's data.

## 12. Non-functional notes

- Errors from the AI boundary always leave the app in a recoverable state — user text is
  never lost on a failed analysis.
- Server-side logging during development is fine; never log full API keys or, beyond what's
  needed for debugging, verbatim user writing content at `info` level (debug-level, local-only
  logging of payloads is acceptable while developing).
- Scores and any future CEFR-style labeling are always presented with a visible caveat that
  they are model-generated heuristics, not standardized assessment.
