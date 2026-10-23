# Duolingo research — context for scaling the English Coach

> **Purpose of this file.** Durable context for future sessions (human or agent) planning the
> next phase of this app: going from "AI writing corrector" to a coach that makes the learner
> *retain* what they learn. Part A is the decision record and the mapping to this codebase.
> Part B is the raw research (public sources only — no Duolingo binaries were inspected; see
> "Method" below). Read Part A first; dip into Part B when an issue cites a source ID like [S1].

## Part A — Decisions and mapping to this codebase

### Method

- Research date: 2026-10-23. Sources: Duolingo's own papers (HLR, notification bandit),
  Duolingo blog/engineering posts (Birdbrain, path, streak, Practice Hub, Energy), IEEE
  Spectrum article by Duolingo staff, investor releases, plus a few secondary sources marked
  `[2nd]` in Part B.
- Reverse engineering the Duolingo app binary was considered and **rejected**: Duolingo's
  Terms forbid it, and the mechanisms that matter (spaced-repetition model, Birdbrain,
  session generation) run server-side, so the client would only reveal UI and feature-flag
  names. Published research gives the actual models.

### Scope decisions (agreed with the user, 2026-10-23)

- **Now in scope** (overrides SPEC.md §8 for these items once SPEC is updated): spaced
  repetition on mistake patterns, a simple streak with freezes, a mixed daily session,
  difficulty targeting, "explain my answer", mistake review hub.
- **Still out of scope**: voice/speech recognition, pronunciation, multi-user/auth/social
  (leagues, friend streaks), native mobile.
- **Focus Music**: paste a Spotify or YouTube link and it plays, using the **official embeds
  only** (Spotify Embed iframe, YouTube IFrame player with `listType=playlist&list=<id>`). No
  OAuth, no Spotify Web Playback SDK (needs Premium + developer app). Spotify's embed plays
  full tracks only when the user is logged into Spotify in that browser, otherwise 30s
  previews. The Spotify iFrame API controller (`createController`/`loadUri`) exists, but
  community reports say its play controls are unreliable, so treat it as optional.

### The core insight

Duolingo's weak spot is long-form written production (paragraphs, emails, technical
explanations) — its efficacy evidence is mostly reading/listening, and grading is exact-match
against a large answer corpus. This app's strength is exactly that: nuanced written feedback
(incorrect / unnatural / natural). Borrow Duolingo's **memory and scheduling machinery**
(HLR + Birdbrain + interleaving), use habit mechanics only as light scaffolding, and measure
success as *patterns mastered and kept mastered*, never XP. (Peer-reviewed criticism: learners
chasing XP at the expense of learning — [S21].)

### Mechanism → where it lands in this repo

| Duolingo mechanism | Source | Lands in | Gap today |
|---|---|---|---|
| Half-Life Regression: p = 2^(-Δ/h), h from seen/correct/incorrect counters only (the per-word difficulty weights overfit — don't add them) | [S1] | `MistakePattern` (`prisma/schema.prisma`), new pure fn next to `src/server/domain/mistakes/mastery.ts` | Pattern has only `occurrenceCount` + `consecutiveCorrectCount`; no practice timestamps or correct/incorrect counters |
| "Cracked/fading" skills — mastered decays when recall drops | [S1][S2] | `applyExerciseResult` in `mastery.ts` | `MASTERED` is terminal: "MASTERED patterns are left alone" — never decays |
| Practice due/weakest items | [S1] | `selectPatternsForPractice` in `src/server/domain/exercises/selection.ts`, dashboard recommendation (`src/app/page.tsx`) | Sorts by mastery weight then frequency; ignores time since practice |
| Birdbrain: Elo/IRT ability × difficulty, target ~70% success | [S3][S4][S19] | exercise generation prompt (`src/server/ai/prompts/exerciseGeneration.ts`), `Exercise` model | Exercises carry no difficulty; no ability estimate |
| Interleaved path / mixed session | [S5] | new "today" route reusing Writing Coach + exercise services | Write and practice are separate silos |
| Explain My Answer | [S6][S7] | new `AIProvider` method (both providers), exercise UI | Grading is deterministic and silent beyond `explanation` |
| Closest-acceptable-answer diff (Levenshtein) | [S1] | `src/server/domain/exercises/answerChecking.ts` | REWRITE/TRANSLATION strict match → false "incorrect" (known tradeoff in CLAUDE.md) |
| Legendary (unscaffolded challenge) | [S5] | mastery transition IMPROVING → MASTERED | Mastery reachable via easy multiple-choice alone |
| Low-bar streak + freezes | [S8][S10] | dashboard, derived from sessions/attempts | None |
| Daily reminder (rotating copy) | [S13] | undecided channel (local app: Web Push vs. email) | None |
| L1 transfer (PT→EN false friends etc.) | inference | writing-analysis prompt + schema | AI explains in PT but doesn't tag L1 interference |

### Architecture constraints to respect (from CLAUDE.md)

- New AI capability = new `AIProvider` method implemented in **both** `providers/anthropic.ts`
  and `providers/gemini.ts`, validated by a Zod schema.
- Grading stays deterministic and never requires an API key; "explain my answer" is a separate,
  optional AI call, not part of grading.
- Pure logic (half-life, Elo update, streak computation, URL parsing) as pure functions with
  unit tests; services/repositories keep `userId` scoping.
- Schema changes need a migration → Postgres must be running (`docker compose up -d`).

### Issue map

GitHub issues created from this document are labelled `retention` (learning engine and habit)
or `music` (Focus Music). Keep this table updated when issues are created or closed.

Epic: **#8**. Suggested order: #9 → #10 → #11 → #12 → #13 → #16 → #14 → #15 → #17 → #18 → #19 → #20.

| Issue | Topic | Mechanism / source |
|---|---|---|
| #8 | [Epic] From corrector to coach | — |
| #9 | Update SPEC.md with the new scope | — |
| #10 | Half-life per `MistakePattern` (migration) | HLR [S1] |
| #11 | MASTERED decays when recall fades | HLR strength meter [S1][S2] |
| #12 | Review queue of due patterns | Practice Hub "Mistakes" [S6] |
| #13 | Mixed daily session `/today` | Interleaved path [S5] |
| #14 | Target difficulty (Elo per category, ~70%) | Birdbrain [S3][S4][S19] |
| #15 | Explain my answer (new `AIProvider` method) | Max [S6][S7] |
| #16 | Closest-acceptable-answer diff, no AI | [S1] |
| #17 | Low-bar streak with rest days | [S8][S10] |
| #18 | Unscaffolded mastery check | Legendary [S5] |
| #19 | Tag Portuguese (L1) interference | inference |
| #20 | Daily reminder — channel undecided (`question`) | Notification bandit [S13] |
| #21 | Focus Music: play a pasted Spotify/YouTube link | — |
| #22 | Focus Music bug: closing the popover stops playback | — |
| #23 | Focus Music: saved playlists | — |

Existing issues touched: #6 (Focus Music — commented, close together with #22), #7 (Vocabulary —
should reuse #10/#12 instead of its own scheduler).

---

## Part B — Research notes

Research date: 2026-10-23. Scope: public sources only (Duolingo research papers, Duolingo blog, IEEE Spectrum article by Duolingo staff, investor material, reputable press). No binaries were inspected.

**Legend**
- **[F]** = published or observed fact, with source IDs in brackets (see Sources at the end).
- **[I]** = my inference or interpretation, not stated by a source.
- **[2nd]** = the claim comes only from a secondary source (press, fan wiki, third-party blog). Treat it with more caution.
- **→ App:** = suggestion for the single-user writing-practice web app (a Brazilian developer learning English). Suggestions only, not decisions.

---

### 1. Feature inventory (2025-2026)

#### 1.1 Learning path, sections, units, levels
- [F] Since 1 Nov 2022 the home screen is a single linear **path**. Each circle (a "level") equals one old crown level of a skill. Levels from different skills are **interspersed** rather than finished one skill at a time. Lessons are grouped into small **units**. Practice and Stories sit inside the path. Grammar Tips moved into a per-unit **guidebook**. Legendary now applies per unit. [S5]
- [F] Duolingo says the path ordering is based on spaced repetition: a concept is revisited soon after it is introduced, then at widening gaps. The path also built in the "hover/waterfall" mixing approach that learners had invented. [S5]
- [F] Courses are aligned to CEFR. For example, the English-for-Spanish-speakers course was studied across its A1 and A2 sections. [S14]. [2nd] A LINGUIST List call for proposals describes the English course for Portuguese speakers as built around communicative functions, CEFR-aligned, with the first units at about A2. It is undated. [S23]
- → App: offer a "today's path" that mixes new technical-writing prompts with review of older mistake patterns, instead of separate silos.

#### 1.2 Exercise types
- [F] Speaking appears from the first lesson: repeat words, translate sentences out loud, and bite-sized dialogues. There are also Flashcards that you recall and then say aloud, and an optional mic in writing exercises. [S16]
- [F] Listening exercises start with text support. As learners progress, more of them are audio-only with no text. [S17]
- [2nd] Other common types listed by the fan wiki and app notes: translate (typed or word-bank), tap the pairs (matching), type what you hear, listen-and-tap, fill-in, and speak this sentence. [S24]
- [F] Grading of free-text translation: when Duolingo cannot parse a mistake, it shows a diff against the closest acceptable answer, using Levenshtein distance. [S1]
- → App: add a "closest acceptable answer + diff" view to REWRITE/TRANSLATION grading. This softens the known strict-match tradeoff without an extra AI call.

#### 1.3 Immersive and character-driven content
- [F] **Stories** are short dialog stories built into the path and placed at the right difficulty. Duolingo says they train reading and listening from context. [S5]
- [F] **DuoRadio** is audio-only, podcast-like episodes hosted by Duolingo characters, built into the path for several courses. [S17]
- [F] **Adventures** were announced at Duocon 2024. They are game-like scenarios with characters (for example, ordering coffee) and are not limited to Max subscribers. [S11]
- [F] There is a recurring cast of characters (Lily, Oscar, Falstaff and others) across the path, Video Call and Roleplay. [S5][S11][S16]
- → App: a recurring "persona" interviewer or tech-lead character for Interview Practice could add continuity. This is low priority.

#### 1.4 Practice Hub / Practice tab
- [F] The Practice tab has these modes: **Mistakes** (review previous mistakes), **Words** (recommended vocabulary), **Speak**, and **Listen**. It also replays Stories, Radio and Adventures, and Max users can review past Video Call and Roleplay sessions. Duolingo later made the Practice tab free for all learners. [S6]
- [F] Older system: practice sessions drew exercises tagged with the words that the student model marked as due. [S1]
- → App: the existing mistake-patterns page is the natural "Mistakes" hub. Add a one-click "practice my due patterns" session.

#### 1.5 Legendary
- [F] Legendary is an optional harder challenge at the end of a unit. Completing it marks the whole unit as Legendary. [S5]
- → App: a "mastery check" for a pattern: a harder, unscaffolded exercise (free rewrite, no options) before the pattern is marked mastered.

#### 1.6 Duolingo Max (AI features)
- [F] Max launched in March 2023 on GPT-4. It is a tier above Super. The launch features were **Explain My Answer** (in-lesson chat explaining why an answer was right or wrong) and **Roleplay** (open-ended scenario chat with characters, followed by AI feedback on accuracy and complexity). [S7]
- [F] Explain My Answer was later made free for all learners. [S6]
- [F] **Video Call with Lily** was announced at Duocon in September 2024 for Max. It is a spontaneous conversation that adapts to the learner's level and is available for English, Spanish and French. [S11]
- → App: Explain My Answer maps directly to a "why was this wrong?" follow-up on any graded exercise. Roleplay maps to the existing Interview Practice. Adding a post-session "accuracy + complexity" summary is cheap.

#### 1.7 Duolingo English Test (DET)
- [F] The DET is a separate product: an online, adaptive English proficiency test. It is listed under Duolingo research publications. [S9]. It has limited relevance to the app, except as a possible target level for a Brazilian developer.

#### 1.8 Hearts → Energy
- [F] In 2025 Duolingo replaced Hearts (each mistake cost 1 heart for free users) with **Energy**. Energy is a battery drained by lessons and topped up by streaks of correct answers. Reviewing mistakes at the end of a lesson is free, and Energy fully recharges in about a day. Duolingo's stated reason: beginners were 2x more likely to run out of hearts mid-lesson, and mistakes are a natural part of learning. [S18]
- [2nd] The bar holds 25 units, Super/Max subscribers get unlimited energy, and some users pushed back (including a petition). [S25]
- [I] Hearts and Energy are mainly a monetization lever (free versus paid). Duolingo's own rationale is that penalizing mistakes hurts learning.
- → App: don't penalize mistakes. If anything, reward correct streaks inside a session.

---

### 2. Retention and learning-science mechanisms

#### 2.1 Half-Life Regression (HLR), Settles & Meeder, ACL 2016
- [F] **Model:** recall probability p = 2^(-Δ/h), where Δ is the lag since the item was last practiced and h is the item's half-life in the learner's memory. [S1]
- [F] **Estimated half-life:** ĥ = 2^(Θ·x). The weights Θ are fit to log data. Pimsleur and Leitner are special cases with hand-picked weights. [S1]
- [F] **Inputs (features):**
  - *Interaction features*: per student-word counters for total times seen, times correct and times incorrect.
  - *Lexeme tag features*: about 20k sparse indicators, one per word, used to model each word's inherent difficulty. [S1]
- [F] **Unit of scheduling:** the lexeme tag (word plus morphology, e.g. être.V.GER), not the sentence. [S1]
- [F] **What it drives:**
  - The skill **strength meter**: the average probability of recalling a random word from that skill. At 4 bars a skill is "golden". With fewer bars it has decayed, the "cracked/fading" signal.
  - Selection of the "weakest words" for practice sessions. [S1][S2]
- [F] **Results:**
  - Mean absolute error was cut by 45%+ compared with baselines, including Leitner, the previous production model. [S1]
  - The best online variant improved practice-session daily retention by 9.5% and lesson retention by 1.7%. The abstract summarizes this as a 12% improvement in daily student engagement. [S1]
- [F] **Lesson learned:** the per-word difficulty features overfit. Students complained that some words decayed rapidly no matter how much they practiced. A version without those features (interaction counters only) did better in a 3.3M-student, two-week experiment and also solved the cold-start problem for new courses. [S1]
- [F] The student-model database had billions of entries, updated about 3,000 times per second (2016). [S2]
- → App:
  - Give each mistake pattern a half-life from three counters: seen, correct and incorrect. Compute p = 2^(-days_since_last/h).
  - Surface "fading" patterns when p falls below a threshold (for example 0.5) to drive the dashboard recommendation.
  - Skip per-pattern difficulty weights. Duolingo found them harmful, and one user has no data to fit them.

#### 2.2 Birdbrain (exercise difficulty and learner ability)
- [F] **V1 (2020):** a logistic regression inspired by item response theory (IRT). P(correct) is a function of learner ability and exercise difficulty. Exercise difficulty is the sum of its component features (exercise type, vocabulary words, and so on). After every exercise, one SGD step updates both parameters, which generalizes the Elo rating system. [S4]
- [F] **Update behavior:** a surprising result (a beginner gets a hard item right) moves both parameters a lot. An expected result moves them very little. [S4]
- [F] **V2:** an LSTM compresses a learner's exercise history into a 40-dimensional vector that is updated after each exercise. V2 replaced V1 completely in May 2022, after A/B tests showed gains in both engagement and learning. [S4]
- [F] **Rollout:**
  - Birdbrain ran first in "shadow mode", logging predictions without using them.
  - It was then A/B tested.
  - Duolingo reports that right-difficulty lessons helped learners learn more and come back more often.
  - Scale: about 1 billion exercises per day. [S3][S4]
- [F] **How exercises are picked:**
  - The **Session Generator** builds each lesson from a large candidate pool.
  - Birdbrain tells it which candidates are at the right difficulty for that specific learner. [S3]
- [2nd] Settles told VentureBeat the generator requests about 200 candidate challenges and uses about 14. [2nd] Von Ahn said the target is items the learner gets right about 70% of the time, and easier items when the learner is struggling. [S19]
- [I] Two models run side by side. HLR-style memory decay answers "what should be reviewed". Birdbrain answers "how hard should the next exercise be".
- → App:
  - Keep one scalar "ability" per category (grammar, vocabulary, technical register) and a difficulty tag per generated exercise.
  - Update both Elo-style after each graded attempt.
  - Ask the generator for exercises at the difficulty where predicted success is about 70%.

#### 2.3 Interleaving, spacing, active recall, feedback
- [F] **Interleaving:** the path mixes levels from different skills rather than blocking one skill until it is finished. [S5]
- [F] **Spacing / lag effect:** a concept is revisited soon after it is learned, then at expanding intervals. [S1][S5]
- [F] **Active recall:**
  - Production-oriented items: typed translations, speaking from memory, and Flashcards that ask you to recall and then speak. [S16]
  - Listening that gradually removes text support. [S17]
- [F] **Immediate feedback:**
  - Per-exercise correction and explanation. [S1]
  - Explain My Answer. [S6][S7]
  - Free end-of-lesson mistake review. [S18]
- [F] **Mistake review:**
  - The Practice tab "Mistakes" mode. [S6]
  - End-of-lesson mistake review, which does not cost Energy. [S18]
- → App: the existing `active → improving → mastered` mastery states could also decay back from `mastered` when the HLR-style recall estimate drops. That would mirror "cracked" skills.

#### 2.4 Difficulty calibration and experimentation culture
- [F] Duolingo says it A/B tests nearly every change. [S3][S8]
- [F] Small effects are reported and valued because of scale. Examples: +0.38% DAU [S10] and +1.7% D7 [S10].
- [I] For a single user, A/B testing is meaningless. The analogue is simple instrumentation, such as tracking how quickly patterns move from active to mastered.

---

### 3. Engagement and habit mechanisms (with published numbers)

| Mechanism | What Duolingo published | Source | → App |
|---|---|---|---|
| **Streak** | Learners on a 7-day streak are 2.4x more likely to return the next day. Learners who reach a 7-day streak are 3.6x more likely to complete their course. Over 6M users were on 7+ day streaks (Jan 2022). | [S8][S10] | Show a daily-practice streak. Count any one session, not a quota. |
| **Decoupling streak from daily goal** | Streak needs just 1 lesson per day, separate from the daily XP goal. Results: +3.3% D14 retention, +1% DAU, +10.5% of daily learners on a streak. More than half of daily learners now have a 7+ day streak, up from about a third. Downside: fewer people hit their daily goals. | [S8] | Keep the streak bar low: one exercise or one short writing. |
| **Streak Freeze** | Being allowed to equip 2 freezes gave +0.38% daily active learners. Duolingo cites research that some "slack" is more motivating than rigid rules. | [S10] | Allow a limited number of "rest days" per week. |
| **Streak animations / milestones** | +1.7% chance a new learner is still active 7 days later. | [S10] | Light milestone feedback (day 7, 30). Low cost. |
| **Loss aversion** | Duolingo explicitly says long streaks motivate through loss aversion. | [S10] | Be cautious here. See criticisms. |
| **Leagues / leaderboards** | 10 weekly XP tiers, from Bronze to Diamond. Top performers are promoted each week. | [S21] | Not applicable for a single user. A "beat last week's XP" self-competition could work. |
| | At launch (about 2018-19): +17% learning time, and "highly engaged" learners tripled. | [S12][2nd] (written by Jorge Mazal, then Duolingo CPO, on Lenny's Newsletter) | |
| **Push notifications** | Recovering Difference Softmax bandit picks reminder templates while accounting for novelty decay ("fresh" templates work better). Result: +0.5% DAU and +2% new-user retention. | [S13] | A single daily reminder (email or web push) at the user's usual time, rotating among a few message templates. |
| | Internal rule: "protect the channel" (don't raise notification volume). | [S12][2nd] | |
| **Overall growth program** | Leaderboards, notifications and streak work raised CURR (current-user retention rate) by 21%. Duolingo describes this as more than a 40% cut in daily churn of its best users. DAU grew 4.5x over 4 years. | [S12][2nd] | n/a |
| **Friend Streak** | Shared streak with up to 5 friends. Users with at least 1 Friend Streak are 22% more likely to complete their daily lesson (Duolingo internal data, observational). | [S20] | n/a (single user) |
| **XP, quests, gems** | Quests and monthly challenges sit in a Quests tab. Gems buy Energy refills. | [S5][S18] | Optional "weekly quest": for example, use 3 new technical phrases correctly. |
| **Scale context** | More than 50M DAU in Q3 2025 (+36% YoY). More than 10M paid subscribers in Q1 2025. | [S22] | n/a |

- [I] Most published engagement numbers measure retention and DAU, not learning. HLR and Birdbrain are the exceptions, since Duolingo also reports learning measures for them.

---

### 4. Criticisms and limits

- **Gamification misuse** [F, peer-reviewed L@S 2022, independent researchers]:
  - The study analyzed 9 years of forum data plus 15 interviews.
  - It found learners who fixate on XP and leagues ("XP farming", redoing easy lessons) at the expense of learning.
  - Some reported burnout and dropping out. [S21]
- **Engagement-first metrics** [I, supported by S8/S10/S12]:
  - Most published wins are DAU, streak and retention gains.
  - Duolingo itself admits the streak/goal decoupling reduced daily-goal completion. [S8]
- **Production practice is weaker than reception** [F/I]:
  - The efficacy studies mainly measure reading and listening. [S14][S15]
  - Duolingo cites speaking research for beginners, but published speaking evidence is thinner. [S15]
  - A 2024 Language Learning & Technology study (n=48, two Duolingo-affiliated authors) reports gains in productive skills after about 27 hours. [S26][2nd summary]
  - Written production beyond the sentence level (paragraphs, emails, technical explanations) is barely covered. [I]
- **Efficacy evidence is mostly in-house and non-randomized** [F]:
  - The English course for Spanish speakers: learners who completed A2 scored Intermediate High in reading and Intermediate Mid in listening on ACTFL scales (n=263, third-party test, Duolingo-run study). [S14]
  - The Spanish/French studies compare learners with university semesters, not with randomized controls. [S15][S26]
- **AI-first shift (2025)** [2nd]:
  - Von Ahn's memo announced phasing out contractors for AI-generated content.
  - Duolingo launched nearly 150 new courses in about a year.
  - Users complained about quality, and von Ahn later clarified the memo.
  - There is no controlled evidence of a drop in learning outcomes. [S27]
- **Hearts/Energy as paywall friction** [2nd]: users pushed back against Energy. [S25]
- **HLR overfitting** [F]: per-word difficulty weights made some words decay "unfairly fast", and users noticed. [S1]
- **Exact-match grading** [F]: Duolingo relies on large corpora of acceptable answers plus a closest-match diff. [S1] [I] The app's 1-3 acceptable answers per exercise is far thinner, so false "incorrect" verdicts are more likely.
- → App:
  - Your edge over Duolingo is long-form written production with nuanced feedback, which is exactly Duolingo's weak spot.
  - Use streaks and reminders only as light scaffolding.
  - Measure success by patterns mastered and patterns kept mastered, not XP.

---

### 5. Brazil / Portuguese-speaker notes
- [2nd] An English course for Portuguese speakers exists and is CEFR-aligned. [S23] I found no official Duolingo figure for Brazil's share of English learners.
- [I] Language-transfer errors are well-known L1 interference patterns that the existing AI feedback could tag explicitly. Examples: false friends like "actually"/"atualmente" and "pretend"/"pretender", preposition and article overuse, and "make/do". [I, no source]
- [I] Duolingo's English efficacy study used the course for Spanish speakers. Results for Portuguese speakers are likely similar in structure but were not separately published.

---

### 6. Prioritized translation for the app (inference only)
1. **Pattern half-life + fading state:** three counters per pattern, p = 2^(-Δ/h), and decay from mastered → improving when p is low. Basis: HLR. [S1]
2. **Target-difficulty exercise generation:** an Elo-style ability per category, with the generator asked for exercises at about 70% predicted success. Basis: Birdbrain. [S4][S19]
3. **Mixed daily session:** new prompt plus due-pattern review, interleaved. Basis: path. [S5]
4. **Explain-my-answer follow-up** on graded exercises, and a diff against the closest acceptable answer. Basis: [S1][S6][S7]
5. **Low-bar streak** (one activity counts) with 1-2 freezes. Basis: [S8][S10]
6. **One daily reminder** with rotating copy. Basis: [S13]

---

### Sources
Primary (Duolingo-authored):
- [S1] Settles & Meeder (2016), A Trainable Spaced Repetition Model for Language Learning, ACL. https://research.duolingo.com/papers/settles.acl16.pdf
- [S2] Duolingo Blog, "How we learn how you learn" (Settles, 2016). https://blog.duolingo.com/how-we-learn-how-you-learn/
- [S3] Duolingo Blog, "Learning how to help you learn: Introducing Birdbrain!" (2020). https://blog.duolingo.com/learning-how-to-help-you-learn-introducing-birdbrain/
- [S4] IEEE Spectrum, "How Duolingo's AI Learns What You Need to Learn". Written by Duolingo staff (Bicknell, Brust, Settles). https://spectrum.ieee.org/duolingo
- [S5] Duolingo Blog, "Introducing the new Duolingo learning path" (2022). https://blog.duolingo.com/new-duolingo-home-screen-design/
- [S6] Duolingo Blog, guide to the Practice tab / Practice Hub. https://blog.duolingo.com/guide-to-duolingo-practice-hub/
- [S7] Duolingo Blog, "Introducing Duolingo Max" (2023, since updated). https://blog.duolingo.com/duolingo-max/
- [S8] Duolingo Blog, "Improving the streak" (Anton Yu, 2020). https://blog.duolingo.com/improving-the-streak/
- [S9] Duolingo Research home / publications. https://research.duolingo.com/
- [S10] Duolingo Blog, "The habit-building research behind your Duolingo streak" (2022). https://blog.duolingo.com/how-duolingo-streak-builds-habit/
- [S11] Duolingo investor press release, "Duolingo Introduces AI-Powered Innovations at Duocon 2024". https://investors.duolingo.com/news-releases/news-release-details/duolingo-introduces-ai-powered-innovations-duocon-2024
- [S13] Yancey & Settles (2020), A Sleeping, Recovering Bandit Algorithm for Optimizing Recurring Notifications, KDD. https://research.duolingo.com/papers/yancey.kdd20.pdf
- [S14] Duolingo Blog, "How well does Duolingo teach English?" https://blog.duolingo.com/how-well-does-duolingo-teach-english/
- [S15] Duolingo Blog, effective intermediate learning. https://blog.duolingo.com/effective-intermediate-learning
- [S16] Duolingo Blog, approach to speaking skills. https://blog.duolingo.com/covering-all-the-bases-duolingos-approach-to-speaking-skills
- [S17] Duolingo Blog, approach to listening skills. https://blog.duolingo.com/covering-all-the-bases-duolingos-approach-to-listening-skills/
- [S18] Duolingo Blog, "Duolingo Energy". https://blog.duolingo.com/duolingo-energy/
- [S20] Duolingo Blog, product lessons: Friend Streak. https://blog.duolingo.com/product-lessons-friend-streak/
- [S22] Duolingo shareholder letters / releases: Q3 2025 (https://investors.duolingo.com/news-releases/news-release-details/duolingo-surpasses-50-million-daily-active-users-grows-dau-36) and Q1 2025 (https://investors.duolingo.com/news-releases/news-release-details/duolingo-adds-record-number-daus-surpasses-10-million-paid). Figures came from search snippets because the pages returned 403 to direct fetch.

Secondary:
- [S12] Jorge Mazal (former Duolingo CPO), "How Duolingo reignited user growth", Lenny's Newsletter. https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth
- [S19] VentureBeat, how Duolingo uses AI (quotes Settles and von Ahn). https://venturebeat.com/ai/how-duolingo-uses-ai-in-every-part-of-its-app
- [S21] Hadi Mogavi et al. (2022), When Gamification Spoils Your Learning, ACM L@S. https://arxiv.org/pdf/2203.16175
- [S23] LINGUIST List call for proposals, English for Portuguese speakers course. https://linguistlist.org/issues/33/320/
- [S24] Duolingo fan wiki, Exercise types (unofficial). https://duolingo.fandom.com/wiki/Exercise
- [S25] Duolingo fan wiki, Energy (https://duolingo.fandom.com/wiki/Energy). Android Authority on Energy (https://androidauthority.com/quitting-duolingo-energy-system-3599842)
- [S26] Avant Assessment-hosted study PDFs on Duolingo efficacy (https://rebrand.avantassessment.com/wp-content/uploads/The-effectiveness-of-Duolingo-in-developing-receptive-and-productive-language-knowledge-and-proficiency.pdf). NAU record of the reading/listening study (https://experts.nau.edu/en/publications/evaluating-the-reading-and-listening-outcomes-of-beginning-level-/)
- [S27] Know Your Meme explainer and MarketBeat on the AI-first memo backlash (https://knowyourmeme.com/editorials/whats-the-duolingo-ai-first-controversy-the-ceos-pro-ai-message-and-the-online-backlash-explained, https://www.marketbeat.com/articles/continuing-to-hire-duolingos-ceo-clarifies-ai-stance-after-backlash--read-the-memo-2025-05-23)

Verification notes:
- I read S1-S8, S10, S12-S18, S20 and S21 directly.
- S11, S19, S22-S27 are based on search-result summaries and were not read in full.
- No Duolingo Help Center page on exercise types was found. I did not verify the current Streak Society perks or exact Energy costs against an official page.
