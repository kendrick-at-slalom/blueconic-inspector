# AGENTS.md

## Stack

<!-- One line per layer. Detected from project. -->

Planned, not yet scaffolded (`package.json` is still the `npm init` stub as of 2026-07-15):

- TypeScript on Node 24, run via `tsx` (no build step in the prototype)
- Playwright (headless Chromium) behind a `Runner` interface
- Express for the SSE service; vitest for tests; pnpm as package manager

## Build / Test / Lint

<!-- Copy exact commands so agents don't guess. -->

No real commands exist yet — the `test` script is the npm-init placeholder. Fill this section with exact commands at the scaffold step (expected: `pnpm vitest run`, `npx tsx src/cli.ts <url>`, `pnpm lint`). Until then, don't guess.

<!-- working-memory:start -->
## Working Memory

This project uses a two-tier working memory at `_working-memory/`.

**AGENT INSTRUCTION:** scan this section BEFORE deciding what to read. If your task matches a row in the on-demand table, that file is required reading before you proceed.

### Always read on session start:

- `_working-memory/activeContext.md`: current focus, last decision, known risks (≤20 lines, local only / gitignored)

### Read on demand:

| File                 | Read when...                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| `projectOverview.md` | Before starting a feature, or onboarding to the codebase                                          |
| `decisionLog.md`     | Before an architectural or scoping decision; check what's already been settled                     |
| `dataContracts.md`   | Before creating or changing anything that produces or consumes shared data                         |
| `conventions.md`     | Before writing new code, or when reviewing a pattern                                               |
| `openQuestions.md`   | When you hit ambiguity; check here before guessing                                                 |
| `antipatterns.md`    | Before proposing a refactor, library swap, or architectural change; check whether it's been tried  |

### Updating working memory:

- After completing a feature or making a significant decision, update `activeContext.md` and the relevant on-demand file.
- `activeContext.md` is a queue: evict completed items to `decisionLog.md`.
- `decisionLog.md` and `antipatterns.md` are both append-only. Never edit past entries.
- Never let `activeContext.md` exceed 20 lines.
<!-- working-memory:end -->

## Conventions

Canonical list lives in [`_working-memory/conventions.md`](_working-memory/conventions.md). The two that break the product if violated: `src/types.ts` is the frozen contract (flag deviations, never silently fix), and `core/`/`providers/` never import `service/`. Model routing for delegated work is defined in [`CLAUDE.md`](CLAUDE.md).
