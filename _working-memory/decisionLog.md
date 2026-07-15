# Decision Log

Append-only; newest entry on top. Don't edit past entries; supersede them with a new one.

## 2026-07-15: `consent` category + CMP detection rows; autoconsent chosen for October

**Source:** user request 2026-07-15, prompted by the PDP batch-crawl finding; `src/providers/vendorTable.ts`, `src/types.ts`

**Context:** Columbia's homepage came back with only a platform signal and no pixels, which looked like consent-gating. A raw-request check (`crawl-results/`, columbia-diag) disproved that: Columbia runs no CMP from a US IP. It is a Salesforce Composable/PWA (Mobify) behind PerimeterX bot defense, loading tags via Adobe Launch after hydration, outside our window. CMP banners are largely geo-driven, so US-IP crawls of US sites rarely surface them (ties to the geo open question). The CMP rows still stand as a general capability, but Columbia was the wrong poster child; recorded so the "Columbia = consent-gated" claim does not propagate.
**Decision:**

- Added present-tier CMP rows (OneTrust, Cookiebot, TrustArc, Osano, Didomi, Usercentrics, plus IAB TCF via the `__tcfapi` global) under a new `consent` category.
- **This required adding `consent` to `SignalCategory` in the frozen `types.ts` — additive and backward-compatible, flagged for FE sign-off** (same process as `evidence_total`). No existing category fit; putting a CMP under `identity` would corrupt the "no CDP detected" signal BlueConic's pitch depends on.
- CMP fingerprints are public CDN patterns (unit-tested `cdn.cookielaw.org` → `consent.onetrust`) but **not yet validated against a live CMP site** — Columbia did not trigger one on re-crawl (its CMP may load after settle or from a first-party path). Reconcile against a known-OneTrust site.
- **Consent _interaction_ (accept-all) will use `@duckduckgo/autoconsent` in October, as a dependency, not a fork.** License verified **MPL-2.0** (file-level copyleft, commercial-friendly as a dependency, no infection of proprietary code) — clears the "blocking, unverified" gate the handoff flagged. Integration reshapes the runner (navigate → accept → re-settle) and, done faithfully, touches the contract (pre/post-consent tagging). Payoff couples to the October bot-handling work, since the sites that consent-gate us largely overlap the ones bot-blocking us. See [[antipatterns]] on verified-not-remembered.
  **Alternatives considered:** Shoehorn CMP under `identity` (rejected — corrupts the CDP-absence signal). Fork/adapt autoconsent (rejected — re-incurs per-CMP maintenance and pulls MPL onto forked files; use as a dependency).

## 2026-07-15: Build-session implementation choices (inherited scaffold, node:http, substring matching, inert wired)

**Source:** prototype build session; the approved plan; `src/` as built

**Context:** The repo picked up the `unbranded` starter mid-session (npm, antfu ESLint, `@playwright/test`, husky, jsdom, `verbatimModuleSyntax`, `noUncheckedIndexedAccess`), which overrode several stack assumptions in the plan. The build adopts the scaffold rather than fighting it.
**Decision:**

- **Package manager is npm, not pnpm.** The scaffold pins `npm@11.16.0`. Working memory and plan references to pnpm are superseded.
- **SSE runs on `node:http`, not Express.** The scaffold ships no HTTP framework; the built-in does SSE in ~50 lines and adds zero deps. Same event contract.
- **Present-tier matching is case-insensitive substring** against request URLs (not regex). Table entries are plain substrings; extend to regex only if a vendor needs it.
- **The two `wired` matchers (Klaviyo, Meta) are registered but inert** — `matchesBeacon` returns false until a probe-verified shape lands. Registration alone makes their present-tier signal read `none` ("installed, no evidence it fires") rather than `unobservable`; the beacon predicate waits for the probe so we never guess a shape. See [[antipatterns]] on remembered beacon shapes.
- **The callback→AsyncIterable bridge is its own module** (`src/runner/eventQueue.ts`), unit-tested in isolation from Playwright.
  **Alternatives considered:** Impose the plan's pnpm/Express stack (rejected — fights the scaffold, adds deps for no gain). Write the Klaviyo/Meta beacon predicates from public knowledge of their endpoints (rejected — violates the verified-not-remembered rule even though those two shapes are well documented; the probe is 20 minutes out).

## 2026-07-15: `Signal.evidence_total` field + tier-upgrade-only re-emit trigger

**Source:** user decision 2026-07-15 (resolves the flag raised against the verbatim-adoption entry below); encoded in `src/types.ts` `Signal.evidence_total` and the `signal.found` JSDoc

**Context:** The evidence cap (first + last) needed somewhere to record the true count, and the plan never pinned down _when_ a signal re-emits — both gaps could ship a flooded stream or an unrenderable count.
**Decision:** Add required `Signal.evidence_total: number` (snake_case, matching the other core fields) — `evidence[]` caps at first + last, `evidence_total` is the true count _as of that emit_, a snapshot at upgrade not a live counter. Re-emit trigger is **tier upgrade only**; post-tier matches increment `evidence_total` silently and emit nothing (Meta's dozens of `/tr` beacons must not become dozens of SSE events).
**Alternatives considered:** Count in `Signal.notes` (rejected — human-facing prose; FE would regex a string to render a number, breaking on any reword). Re-emit on every match (rejected — floods the stream). Optional field (rejected — required is cleaner and the FE sign-off was a five-minute conversation before any component was written).

## 2026-07-15: `src/types.ts` adopted verbatim as the frozen FE contract

**Source:** user instruction 2026-07-15; commit `5a268c4`

**Context:** types.ts was written ahead of the rest of the build and the FE dev may already be consuming it.
**Decision:** The file is the contract; implementation follows it, never the reverse. No rewrites, reformats, or "improvements." Where it deviates from the plan or spec, the deviation is flagged for the user, not silently fixed — one real contradiction is open (the evidence-cap count has no field to live in; see `openQuestions.md`). Contract changes require user sign-off first.
**Alternatives considered:** Reconciling types.ts to the plan's letter (rejected — the FE contract is the expensive-to-change side, and the user explicitly chose flag-don't-fix).

## 2026-07-15: Event-stream semantics — upgrade re-emit, capped evidence, absence rollups

**Source:** plan review rounds 1–3 (2026-07-15 planning session); encoded in `src/types.ts`

**Context:** The spec left dedup, evidence growth, and absence findings undefined; each had a failure mode (contradictory FE findings, bloated SSE payloads, unrenderable demo narrative).
**Decision:** Signals re-emit on tier upgrade keyed by `signal.id` (FE replaces, never appends). Evidence caps on merge at first + last + count. Zero-match categories emit `<category>.__rollup` signals at `classify`, split `observable` (flat absence claim) vs `unobserved` (hedge) by crawl outcome.
**Alternatives considered:** Emit-once (loses upgrades); unbounded evidence (Meta fires dozens of beacons per load); no rollups (bot-walled and bare sites look identical — the exact failure the schema exists to prevent).

## 2026-07-15: Runner streams `AsyncIterable<ObservedEvent>`, not `Promise<Observation>`

**Source:** plan review round 2; `src/types.ts` `Runner`

**Context:** The obvious `observe(url): Promise<Observation>` shape passes every test while making progressive streaming a lie — signals dump at once after a 5–25s block, and the FE is built against the assumption it streams.
**Decision:** `observe(url, signal?): AsyncIterable<ObservedEvent>` — `request`/`response` events flow as Playwright fires them, `settled` arrives once with DOM + globals. Takes an `AbortSignal` so the SSE route can kill Chromium on client disconnect.
**Alternatives considered:** Promise-of-batch (rejected as the single most likely way to ship broken-but-green).

## 2026-07-15: Probe-first — verify beacon shapes at hour zero, before any matcher is written

**Source:** plan review round 1

**Context:** `wired` matchers written from remembered endpoint shapes and verified last would land at hour 8 with no buffer, and wrong guesses produce confidently false findings.
**Decision:** Step 0 runs `bc-console-probe.js` on the 3 target sites (output → `fixtures/probe-<site>.json`) before `types.ts`. Matchers are written against verified shapes; anything unverified ships `evidence_of_use: 'unobservable'`, never a guess.
**Alternatives considered:** Write-then-verify (the original plan draft's step 8; rejected — turns discovery into a last-minute fire drill).

## 2026-07-15: Provider strategy — wide at `present`, narrow at `wired`

**Source:** `handoff-detection-engine-build.md` (supersedes the three-provider strategy in `detection-engine-description.md`)

**Context:** Detection costs are asymmetric: `present` is a string match (a table row), `wired` needs a verified beacon shape per vendor (real hours, real risk).
**Decision:** ~45-vendor `present` table across seven groups (incl. BlueConic as hard disqualifier, loyalty/subscription for the churn/win-back fast-follow, ad-pixel breadth because count is the demo visual). `wired` for Klaviyo + Meta only. Cut order when it slips: `wired` for Meta → SSE → `present` breadth beyond the hero site's stack. Never cut: schema, event stream, `wired` for the hero site's ESP.
**Alternatives considered:** Three hand-written providers (superseded draft); lifting Omnibug's ~70 decoders (license unverified — blocking gate, deferred to October).

## 2026-07-15: Single package for the prototype; monorepo split deferred

**Source:** plan review round 1 (user choice)

**Context:** The spec sketches a `packages/` monorepo; workspace wiring costs ~1–2h the prototype doesn't have.
**Decision:** One package, `src/{core,runner,providers,service}` + `cli.ts` mirroring the future package boundaries; the `core`-never-imports-`service` rule enforced via ESLint `no-restricted-imports` rather than workspace isolation. Split before the October breadth push.
**Alternatives considered:** pnpm workspaces now (rejected for setup friction; boundaries are preserved either way).

## 2026-07-15: SSE over WebSocket; Playwright over Puppeteer

**Source:** `handoff-detection-engine-build.md`

**Context:** Transport and browser-driver choices were open forks; Blacklight (prior art) is Puppeteer-based.
**Decision:** SSE — the stream is unidirectional, survives proxies, reconnects natively, simpler on Lambda/ALB. Playwright — better CDP access, request interception, multi-context concurrency. Runner stays behind an interface so neither choice leaks into providers.
**Alternatives considered:** WebSocket (bidirectional overkill; revisit only if the FE needs mid-inspection commands), polling (worse UX, more infra), Puppeteer (would be inherited from Blacklight rather than chosen).

## 2026-07-15: Observe-only crawl, with accept-all consent as the one sanctioned exception

**Source:** client decision 2026-07-15, recorded in `handoff-detection-engine-build.md`

**Context:** Crawl posture defines the whole design; consent-gated tags don't fire without acceptance, systematically under-detecting EU sites.
**Decision:** No add-to-cart, checkout, login, or cart mutation. Always accept-all on consent banners (documented as sanctioned, not scope creep); tag signals pre/post-consent; never editorialize consent behavior into compliance findings. Consent handling itself is cut from the prototype.
**Alternatives considered:** Interactive crawl (door left open by the team, but not built for speculatively — the schema represents interaction-gated signals as `requires_interaction` instead).
