# Decision Log

Append-only; newest entry on top. Don't edit past entries; supersede them with a new one.

## 2026-07-15: Event-stream semantics — upgrade re-emit, capped evidence, absence rollups

**Source:** plan review rounds 1–3 (`~/.claude/plans/read-inspector-detection-engine-descript-calm-pebble.md`); encoded in `src/types.ts`

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
