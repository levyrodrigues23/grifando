# Design — Warm cream editorial

A light, paper-on-paper system adapted from a user-supplied style reference (an editorial
product page). Each screen reads as one magazine "spread": a whisper-weight headline, a narrow
serif standfirst, and content separated by surface tone and space rather than lines or shadows.

Source of truth for values: `src/app/globals.css`. Agent-facing rules: `CLAUDE.md`.

## Color

| Token | Value | Role |
|---|---|---|
| `--background` | `#faf9f6` | Canvas cream — every page |
| `--linen` / `--secondary` / `--muted` | `#f1eee9` | Bands, secondary panels, selected options |
| `--stone` | `#d3cec6` | Bar tracks, selection, scrollbar |
| `--card` | `#ffffff` | Writing sheets, cards, the proofed page |
| `--border` / `--input` | `#dedbd6` | Hairlines and field outlines |
| `--foreground` | `#111111` | Ink — text, bar fills |
| `--primary` | `#000000` | Filled primary button |
| `--iron` | `#414141` | Supporting copy, standfirsts |
| `--muted-foreground` | `#585858` | Secondary text, labels |
| `--smoke` | `#767676` | Placeholders (reference `#888` darkened for 4.5:1) |
| `--violet` / `--ring` | `#0007cb` | Rare accent: focus outlines and mistake marks only |
| `--destructive` | `#b3261e` | Errors, "Incorrect", "Fading" (not in the reference) |
| `--success` | `#3f6a35` | "Correct", "Mastered" (not in the reference) |

Strategy: restrained. Neutrals carry the page; violet appears at most once or twice per screen.
No gradients, no `box-shadow`.

## Typography

| Voice | Face | Use |
|---|---|---|
| Display | Inter 300 | `text-display-lg` (48–80px, lh 0.95), `text-display` (40–54px), `text-heading-lg`, `text-heading` (32px), `text-heading-sm` (24px); tracking −0.02 to −0.03em |
| Body | Inter 400 | 16px / 1.5; `text-subheading` 20px |
| Editorial | Source Serif 4 300 | `prose-serif`: the learner's own text, corrections, standfirsts, empty states |
| Labels | JetBrains Mono 400 | `label-mono`: 12px uppercase +0.1em — tags, counts, metadata |

Rules: never 600+ for display; sentence content never uppercased; no kicker above a heading;
`tnum` on globally.

## Shape and space

- Radius by role, set as tokens in `globals.css`: `rounded-pill` for buttons, nav tabs, badges and
  chips; `rounded-card` 16px for cards, sheets, panels and dialogs; `rounded-field` 12px for
  inputs, textareas and selects. The stock `rounded-*` scale maps onto these three.
- Page column 1200px, gutters 24px (mobile) / 48px (desktop).
- Page header: 80px top on desktop; sections separated by 64–96px.
- Cards pad 24px (mobile) / 32px (desktop).

## Components

- **PageShell / PageHeader / Section / SectionTitle** (`components/layout/PageHeader.tsx`) —
  the spread: headline left, 380px standfirst+actions column right on `lg`.
- **Nav** (`NavLinks.tsx`) — a row of pills, the active route is a linen pill with a hairline
  ring; collapses to a disclosure on mobile.
- **Button** — default black, `outline` white with ink border, `ghost` text-only, `link`
  underlined. Heights 44 / 36 (sm) / 28 (xs).
- **WritingSheet** — white sheet with mono label + character count; textarea set in serif
  (or mono for code). The sheet is the field; focus shows an ink ring plus violet outline.
- **Proofed page** (signature) — `HighlightedText` sets the learner's text in serif with a
  violet underline and numbered mono superscript per mistake; `MistakeCard` is the matching
  numbered marginal note, highlighted in linen when targeted.
- **Lists** — hairline-ruled rows (`border-t` on the list, `border-b` per row), not cards.
- **Badge** — mono uppercase pill; outline/secondary/destructive/success.
- **Bars** — 4px tall, stone track, ink fill (`Progress`, weak-area bars).
