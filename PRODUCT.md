# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Brazilian Portuguese-speaking software developers improving their professional English
through writing. The app is public and open source: no login, anonymous per-browser sessions, and visitors bring
their own AI key.

## Product Purpose

A personal AI English coach that learns from the learner's actual mistakes. The learner
writes first, gets feedback that separates *incorrect* from *correct but unnatural* from
*natural* English, and recurring mistakes become patterns that drive targeted active-recall
exercises and spaced review. Success: the learner stops repeating their own mistakes over time.

## Positioning

Not a grammar checker and not a chat window in front of an LLM. The mechanism is the
mistake-pattern loop: write → structured feedback → pattern tracking (half-life recall,
mastery that can fade) → personalized exercises at ~70% target difficulty → review. Feedback
is aware of Portuguese interference (L1 transfer) and leans into developer English
(explaining code, PR descriptions, technical interview answers).

## Operating Context

Primary ritual is a **short daily session**: open the app, do today's session (write, then an
interleaved review), glance at progress (streak with rest days, recent mistakes), close it.
Other modes — free writing, Technical English prompts, Explain Code, interview practice,
exercises, mistake library, vocabulary, focus music playlists — are secondary entries.
AI analysis can take seconds to minutes; waiting states are part of normal use.

## Capabilities and Constraints

- Routes: `/` dashboard, `/today`, `/write`, `/technical`, `/explain-code`, `/interview`,
  `/exercises`, `/mistakes`, `/vocabulary`.
- AI via a provider abstraction (Gemini or Anthropic); scores are heuristic model signals,
  never CEFR levels or test scores.
- Grading of exercises is deterministic (no AI); "Explain my answer" is an optional AI call.
- Practice content is always English. Interface language: currently English with Portuguese
  inside explanations; the author is open to either English or Portuguese UI (undecided —
  do not translate copy as part of visual work).

## Brand Commitments

Name: **Inglesando**. No logo or other brand assets exist yet.

## Evidence on Hand

No testimonials, user counts, or metrics exist. Do not fabricate any.

## Product Principles

- Write first: every correction is attached to the learner's own text and an explanation.
- Honest progress: model scores are labeled as heuristic signals; avoid fake precision.
- Preserve intent: corrections stay close to what was written; the natural version is an
  alternative, not the only right answer.
- Retention over novelty: the daily loop and review of fading patterns come first.
