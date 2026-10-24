# Contributing

How work flows through this repository. Development conventions (architecture, design system,
pinned versions) are in [`CLAUDE.md`](./CLAUDE.md); read it before changing code.

## Branches

| Branch | Role |
|---|---|
| `main` | Released, known-good state. Only receives merges from `develop`. |
| `develop` | Integration branch. Every feature/fix PR targets it. |
| `feature/<short-name>` | New functionality (`feature/focus-music`). |
| `fix/<short-name>` | Bug fixes. |
| `chore/<short-name>` | Tooling, CI, docs, refactors with no behavior change. |

Always branch from an up-to-date `develop`:

```bash
git switch develop && git pull
git switch -c feature/<short-name>
```

Branch protection isn't available on this private free-plan repo, so the rules below are
conventions, not enforcement: never push directly to `main`, and don't merge a PR whose CI
is red.

## Issues

- Open issues with one of the templates (Bug, Funcionalidade, Tarefa técnica). Issues are
  written in Portuguese; code, commits, and repo docs are in English.
- One issue = one deliverable with acceptance criteria. Large themes get an epic issue
  (label `epic`) with a checklist linking its children.
- Before proposing a feature, check `SPEC.md` — it lists what is explicitly out of scope.

### Labels

| Label | Meaning |
|---|---|
| `bug` | Something is broken |
| `enhancement` | New feature or improvement |
| `question` | Needs a decision before implementation |
| `documentation` | Docs only |
| `infra` | CI, database, tooling |
| `tech-debt` | Known debt to pay down |
| `mvp` / `post-mvp` | Scope relative to `SPEC.md`'s MVP |
| `retention` | Retention engine: spaced repetition, review, habit (epic #8) |
| `music` | Focus Music player |
| `epic` | Umbrella issue grouping others |

## Commits

- Imperative, sentence-case subject describing the behavior change, no type prefix — match
  the existing history (`Add Interview Practice, reusing the Writing Coach pipeline per turn`).
- Body explains *why* when it isn't obvious from the diff.
- Reference issues in the body (`Refs #21`) — closing keywords go in the PR description.

## Pull requests

1. Run `pnpm check` locally (typecheck + lint + tests; needs Postgres up and
   `pnpm db:test:prepare` done once).
2. Open the PR against `develop`. The template asks for: what changes, `Closes #N` lines, how
   you tested it, and a checklist of the project's architecture rules.
3. CI must be green. It runs on every PR and on pushes to `develop`/`main`:
   install (frozen lockfile) → typecheck → lint → prepare test DB → tests (real Postgres 17
   service) → production build. No AI keys are available in CI by design.
4. Prefer squash or a clean merge; delete the branch after merging.

## Database changes

- Change `prisma/schema.prisma`, then `pnpm db:migrate` to generate the migration — commit
  the schema and the generated `prisma/migrations/*` folder together.
- Every domain table carries `userId` (see `CLAUDE.md` → Architecture rules).
- After pulling someone's migration: `pnpm db:deploy` (dev DB) and `pnpm db:test:prepare`
  (test DB).

## Dependencies

npm dependencies are pinned on purpose (TypeScript 5.9, Prisma 7.10, ESLint 9 — reasons in
`CLAUDE.md`). Bump them by hand, one at a time, with `pnpm check` and a build. Dependabot only
updates GitHub Actions.
