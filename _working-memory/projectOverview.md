# Project Overview

## What This Is

`@bc/inspector` — a URL goes in, structured findings about a prospect's ecommerce growth-play readiness come out, streamed as they're discovered. Library first (in-process AsyncGenerator), service second (HTTP + SSE). Feeds the frontend and simulation tracks; this package is detection only.

Canonical spec: [`docs/handoff-detection-engine-build.md`](../docs/handoff-detection-engine-build.md). **`docs/detection-engine-description.md` is a superseded draft — do not build from it** (stale provider strategy and cut order).

## Stack

- Language: TypeScript on Node 24, run via `tsx` (no build step in the prototype)
- Browser control: Playwright (headless Chromium), behind the `Runner` interface in `src/types.ts`
- Service: `node:http`, one SSE route (no Express — the `unbranded` scaffold carries no HTTP framework)
- Tests: vitest, jsdom env (light — queue bridge, matchers, core behaviors)
- Package manager: **npm** (scaffold pins `npm@11.16.0`); config owned by the `unbranded` starter
- Deployment: none for the prototype (localhost only); Fargate vs Lambda deferred to October

As of 2026-07-15 the full spine is built and verified end-to-end: runner + queue bridge, core orchestrator, provider table (~50 vendors), CLI, and SSE service. `src/types.ts` is the frozen contract. The two `wired` matchers (Klaviyo, Meta) are registered but inert pending the step-0 probe. Package name in `package.json` is still `blueconic-inspector`, not `@bc/inspector` — the FE-facing name is a loose end to reconcile before the FE imports it.

## Repository Structure

Single package (monorepo split deferred to October). `src/{core,runner,providers,service}` + `src/cli.ts`, mirroring the eventual package boundaries. `fixtures/` will hold probe output (`probe-<site>.json`) from `bc-console-probe.js` runs. The four `*.md` handoff docs in `docs/` are project inputs, not deliverables.

## Key Constraints

- **Observe-only crawl.** No add-to-cart, no checkout, no login, no cart mutation. One sanctioned exception (accept-all on consent banners) — and even that is cut from the prototype.
- **Tier `present` is not capability.** Klaviyo is on nearly every Shopify store; "installed" proves nothing. The `present`/`wired` distinction is the product's core claim.
- **`core/` and `providers/` must never import `service/`** (ESLint-enforced once scaffolded). If transport leaks into detection, local mode and deployed mode drift.
- **Never emit `absent` from a failed look.** A bot-walled crawl and a genuinely bare site must not produce the same output.
- **No `wired` matcher from a remembered endpoint shape.** Verified against real traffic (step-0 probe) or the vendor stays `unobservable`.
- Ship target: build + QA complete late October 2026 (BFCM runway). Prototype: ~24h, cut depth never the pipeline.
- Non-goals: no scoring copy, no simulation, no PII collection, no logged-in state.
