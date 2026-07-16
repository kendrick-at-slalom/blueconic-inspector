# Decision Log

Append-only; newest entry on top. Don't edit past entries; supersede them with a new one.

## 2026-07-16: Reachable-wired-tier plan shipped; live A/B smoke shows stealth alone doesn't mask Playwright's UA

**Source:** implementation of the approved reachable-wired-tier plan (commits `056ba1e`..`8cf7d91`); a live `--active-browse` A/B run against a Magic Spoon PDP

**Context:** The plan's three components — A (HarRunner), B (Meta activation), C (gated stealth + active-browse) — are now in code, 52 tests green (9 files), in sync with origin/main. Component C's verification asked for a live smoke recorded either way.
**Decision / result:** All three shipped. HarRunner replay (`npm run inspect -- --har docs/beacon-capture/magicspoon-beacons.json`) shows Klaviyo/Rebuy/Attentive/Meta all `wired`, deterministic and network-free — it's the demo's guaranteed net and the October test fixture. The Meta matcher is live (`/tr`, enriched with `ev`/`id` from the POST body). The opt-in gate (`src/runner/evasion.ts` `resolveEvasionMode`) opens only on the literal `true`; flag-OFF is byte-identical to the plain crawl. **Live A/B smoke (single pair, not conclusive):** with `--active-browse` ON, Meta upgraded present→wired and Rebuy wired (Rebuy wired on both runs); **Klaviyo and Attentive stayed `present` even with the flag on.** Diagnosed via an outbound Google Ads beacon carrying `uafvl=HeadlessChrome;149...` — `puppeteer-extra-plugin-stealth` under `playwright-extra` is NOT masking the User-Agent in this wiring, so Klaviyo's not-a-bot gate still fails. Attentive additionally needs a form submit (out of observe-only scope). Both runs sat ~25s, so the Meta delta is engagement, not dwell time.
**Verified vs inferred:** VERIFIED the replay wired set and the flag-gate behavior (tests + replay). VERIFIED the UA leak from the outbound beacon. The live A/B is a SINGLE pair — directional, not conclusive (client-side pixel firing varies run to run).
**Next (not started, needs user go):** a UA / client-hints override on top of stealth to chase Klaviyo/Attentive live; 2–3 A/B repeats to confirm the Meta upgrade holds.
**Alternatives considered:** Call live wired "reachable" on the strength of one A/B (rejected — one pair, and the two interaction-gated vendors didn't reach it). Add the UA override now (deferred — offered, awaiting user).

## 2026-07-15: Meta fired client-side after all (Shopify Web Pixel sandbox); supersedes "Meta server-side CAPI, inert"

**Source:** re-inspection of `docs/beacon-capture/magicspoon-beacons.json` (company_id HMWFR8) while planning the reachable-wired-tier work; supersedes the Meta half of the Klaviyo-wired entry below.

**Context:** The entries below concluded Meta was genuinely server-side (Shopify CAPI, "zero `facebook.com/tr` even in the full interacting session"), so the Meta `wired` matcher stayed inert. That conclusion came from the headless beacon-capture crawls, which never engaged the page.
**Decision:** Meta's client-side pixel DID fire. The handed-over consented capture holds 18 `POST https://www.facebook.com/tr/` beacons (status 200): pixel `id=2116162018694323`, `ev=PageView|ViewContent|Lead|SMSSignup`, the `ViewContent` carrying `cd[value]=39` / `content_ids` / `content_name`, plus a hashed `ud[external_id]` (advanced matching). Every payload carries `a=shopify_web_pixel` — Meta runs inside the Shopify Web Pixel sandbox, which is why there's no literal `fbevents.js` request yet `/tr/` fires all session. So "server-side CAPI, inert" is superseded: Meta earns a `wired` matcher (match `facebook.com/tr`, enrich evidence from the POST body's `ev`/`id`). NOT `confirmed` despite the `ud[external_id]` identity — `confirmed` needs the attribution layer, out of the prototype. CAPI may still run in parallel; irrelevant to "client-side fired."
**Messaging the sandbox routing (no contract change):** the routing fact rides in `Signal.notes` (verbatim FE copy), `Evidence.detail` keeps `a=shopify_web_pixel` as proof, and the already-emitted `platform.shopify_web_pixels` present signal lets the FE correlate. A structured `transport`/`routing` tag on `Signal` would be a real contract touch (same "don't make the FE regex prose" reason `evidence_total` got its own field) — deferred, flagged for FE/rubric sign-off.
**Verified vs inferred:** VERIFIED from the capture (real POST bodies with `ev`/`id`/`a=shopify_web_pixel`). The earlier "zero `/tr`" was true of the headless diagnostics (never engaged), not this consented session — the two describe different sessions, not a contradiction in the data.
**Status:** finding + decision recorded ahead of the build. The matcher flip is Component B of the approved reachable-wired-tier plan and is NOT yet in code (`src/providers/wired/meta.ts` still inert).
**Alternatives considered:** Keep Meta inert (rejected — verified traffic shows it fired; "if the HAR shows it fired, it fired"). Wire it at `confirmed` on the strength of `ud[external_id]` (rejected — the attribution layer that earns `confirmed` is out of prototype scope). Re-verify against the 110MB raw HAR before acting (unnecessary — the extract carries the full POST payloads, which are conclusive).

## 2026-07-15: Active-browse spike missed headless; opt-in-gated evasion + HarRunner chosen for live wired

**Source:** the active-browse spike (2026-07-15) plus a user posture decision; the Magic Spoon HAR

**Context:** Klaviyo's discriminating beacons are client-side but interaction-gated. Open question: can a live observe-only crawl trigger them by simulating human browsing (scroll/mouse/dwell on a PDP, which is still observe-only, no cart or forms)?
**Decision:** The spike answered no for plain headless. 55s of simulated window-shopping on a Magic Spoon PDP fired only `client/sessions`; Klaviyo gates "Viewed Product" on not-being-a-bot, and headless Chromium sets `navigator.webdriver = true`. Firing it needs stealth (spoofing headless tells) on top of active-browse. Stealth is bot-detection evasion, so per user decision it is gated behind an explicit per-client/per-inspection **opt-in flag, default OFF** (rationale: a prospect authorizes evasion on their own site). Flag unset means stealth AND active-browse are hard-disabled and the crawl is plain observe-only (present-tier + identity absence). Enforced inside the runner. The clean, no-evasion path to demoing wired is a **HarRunner** that replays a real session's HAR through the unchanged core; its durable role is the deterministic test fixture, with demo-fallback secondary. Both are the next build (plan-mode planned; a planning prompt is written).
**Verified vs inferred:** VERIFIED the plain-headless spike misses. The stealth patch was blocked by the safety classifier as unauthorized evasion (correctly, it's a posture call), so headless+stealth stays UNTESTED. HarRunner is unbuilt.
**Alternatives considered:** Unconditional stealth (rejected: evasion-by-default on prospects' sites is a ToS/optics liability; the handoff flagged bot-detection posture and politeness as open). HAR replay as the sole wired path (kept as fallback, but "replay a canned session to detect features" is weak as the primary demo; opt-in live is stronger when authorized).

## 2026-07-15: Bonus wired matchers (Rebuy, Attentive) + Shopify Web Pixels present row

**Source:** the Magic Spoon HAR sniff (2026-07-15); user greenlit going past the prototype's "Klaviyo + Meta only" wired line; `src/providers/wired/{rebuy,attentive}.ts`, `src/providers/vendorTable.ts`

**Context:** The HAR handed over three more verified shapes with real demo value across the CEO's priority play and multi-channel Cart Recovery. Cheap to add since the data was in hand.
**Decision:**

- **Rebuy `wired`** (`recs.recs.rebuy`): `rebuyengine.com/api/v2/analytics/event` → wired = the recommendation engine actively serving/tracking widgets, i.e. Order Value Expansion live (the CEO's flagged play). May fire on a bare crawl (widgets render on load); untested, the spoof/active-browse work settles it.
- **Attentive `wired`** (`cart.sms.attentive`): `api.attentivemobile.com/1/subscribers` (SMS identity captured) + `<shop>.attn.tv/track` (behavioral) → wired. Multi-channel Cart Recovery proof alongside Klaviyo; interaction-gated like Klaviyo.
- **Shopify Web Pixels present row** (`platform.shopify_web_pixels`, patterns `/web-pixels@` + `web-pixels-manager`): the sandboxed pixel-relay layer (80 sandboxes on Magic Spoon) that explains why client-side Meta/Klaviyo events go quiet — server-side/CAPI routing. First-party path, so a bare crawl already sees it. Filed under `platform` provisionally.
  All verified from the HAR (verified-not-remembered). 35 tests green.
  **Alternatives considered:** Stay strictly at Klaviyo+Meta (rejected — data in hand, high value on the CEO's OVE play). A new `tracking_infra` category for Web Pixels (deferred — avoid another contract touch for a trivial add; `platform` suffices for now).

## 2026-07-15: Klaviyo `wired` matcher live from verified Magic Spoon beacons; Meta confirmed server-side CAPI

**Source:** user DevTools capture on Magic Spoon (2026-07-15, company_id HMWFR8) — a full consented session with product view, add-to-cart, email + SMS signup, and subscription-upsell accepted; `src/providers/wired/klaviyo.ts`, `tests/unit/wired.spec.ts`

**Context:** The entry below left it inferred whether the discriminating Klaviyo/Meta beacons were server-side or interaction-gated, pending a carted, consented session. The session settled it.
**Decision:** Klaviyo's `wired` matcher is live against verified shapes: `a.klaviyo.com/client/events` (behavioral event fired) and `a.klaviyo.com/client/profiles` (identity captured) → `wired`. Explicitly NOT `client/sessions` (presence in disguise). Confirmed end to end with the real registry: `klaviyo.js` → present (`none`), then a `client/events` beacon → upgrade to `wired`. RESOLVED (was inferred): the discriminating Klaviyo beacons are CLIENT-side but INTERACTION-gated. They fired only once a real shopper viewed, carted, and submitted forms, which is why the four earlier headless crawls saw only `client/sessions`. Meta is CONFIRMED server-side: zero `facebook.com/tr` even in the full interacting session, only `fbevents.js` + `signals/config/<pixelID>`, so Meta stays inert (no client-side shape to verify on Shopify CAPI; wiring it needs a site that fires `/tr` in the browser).
**Observe-only consequence (carry to rubric + demo):** because the Klaviyo wired beacons need interaction and the crawler is observe-only (no cart, no form submit), a bare LIVE crawl of a Shopify store won't TRIGGER them — Klaviyo reads `present`/`none` live even though the matcher is correct. The `wired` tier is demonstrable via a HAR replay of a real session (or a future interactive crawl mode), which is the "add to cart and observe" fallback the team reserved but didn't build.
**Alternatives considered:** Wire `client/sessions` (rejected again, per the entry below). Guess Meta's `/tr` shape from public knowledge (rejected — verified-not-remembered, and it wouldn't fire on Shopify CAPI regardless).

## 2026-07-15: Magic Spoon chosen as the demo site; beacon capture re-pointed there

**Source:** user decision 2026-07-15, from the demo-candidate analysis over the PDP batch crawl (`docs/crawl-results/`)

**Context:** Cart Recovery is the anchor play, but four more Phase 1 candidates are now on the table — Order Value Expansion (the CEO's flagged priority: AI-selected next-best add-on/upgrade/bundle, detected on PDP/cart/checkout recommendation modules), plus Retargeting Suppression, Churn/Win-back, and Intelligent Prospecting. The demo wants one captured site whose observed stack tells all five stories at once.
**Decision:** Magic Spoon (Shopify PDP, crawl `ok`, streaming gate PASS, 18 vendors / 11 ad pixels) is the only site in the batch that lights up all five candidate plays: Klaviyo + Attentive (Cart Recovery, genuinely multi-channel), Rebuy (Order Value Expansion — an upsell/cross-sell engine whose surface _is_ the PDP/cart module the play targets), Recharge + Yotpo (Churn/Win-back — subscription + loyalty, native to a subscription-cereal model), 11 ad pixels (Retargeting Suppression + Intelligent Prospecting), and — the spine — an _observable_ `identity` absence: no CDP coordinating any of it, which is the BlueConic pitch stated as a flat, unhedged claim rather than a hedge. Beacon capture is re-pointed from Dr. Squatch to Magic Spoon so the wired-tier probe runs against the site actually being demoed.
**Caveat, carried not resolved:** Magic Spoon is Shopify, so the wired-tier discrimination (the "Klaviyo installed, no evidence of cart events firing" beat) is subject to the same server-side-CAPI gap the beacon diagnostics found — see [[antipatterns]] on verified-not-remembered and the entry below. Plan the demo around present-tier breadth + the identity absence, which need no probe to land; treat wired discrimination as upside pending the capture.
**Alternatives considered:** Keep Dr. Squatch as the capture target (rejected — it shows `recs` and `loyalty` as observable absences, so it can't carry the CEO's Order Value Expansion or the Churn story, and capturing on a non-demo site adds a second variable). Tommy John (viable runner-up — hits all five, but Churn is thinner: Yotpo loyalty, no subscription engine). A non-Shopify site to sidestep the server-side gap (rejected — none in the batch clears the five-play bar; L.L.Bean has 9 ad pixels and Dynamic Yield but no ESP/SMS/loyalty, and the SFCC sites mostly bot-blocked).

## 2026-07-15: Klaviyo `client/sessions` fires but is too weak to wire; the discriminating beacons never fired client-side

**Source:** live beacon-capture crawls, 2026-07-15, 4 Shopify DTC pages (Dr. Squatch home + PDP, Kosas, Magic Spoon). Diagnostic only, not yet reflected in code.

**Context:** The two `wired` matchers (Klaviyo, Meta) are still inert, pending a beacon shape verified against real traffic. This pass checked what actually fires client-side on real Shopify+Klaviyo+Meta stores, ahead of writing those matchers.
**Decision:** Don't wire Klaviyo `client/sessions` as the `wired` signal, even though it's the one beacon that fired on every crawl. It's onsite-tracking init, not proof of a live flow: it fires on nearly every Shopify+Klaviyo store, so wiring it would reintroduce the "every Shopify store looks capable" problem the present/wired split exists to prevent. The beacons that would actually discriminate (Klaviyo `client/event` for Viewed Product, `client/identify` for email captured, and Meta `facebook.com/tr` for PageView) didn't fire client-side on any of the four crawls. VERIFIED: `client/sessions` fires on every site; `/tr` never fired, only `fbevents.js` loading and `signals/config/<pixelID>`. INFERRED, not proven: the missing events go server-side (Shopify CAPI, Klaviyo server webhooks) or need real consent or interaction to trigger; a carted, consented session should settle which. Implication for the rubric: present-vs-wired reads cleanest on custom, non-Shopify stacks and murkiest on Shopify native, which is most of the DTC market. That's a sharper version of the Shopify server-side events gap already flagged under the rubric-branch open question.
**Alternatives considered:** Wire `client/sessions` anyway so at least one Shopify store shows `wired` (rejected: a presence-flavored proxy defeats the reason the present/wired split exists, the same trap the probe-first rule was written to avoid).

## 2026-07-15: `session_replay` + `bot_defense` categories added

**Source:** user decision 2026-07-15, from the Columbia diagnostic; `src/types.ts`, `src/providers/vendorTable.ts`

**Context:** The Columbia crawl surfaced Quantum Metric (session replay) and PerimeterX (bot defense); neither fit an existing category, and both are context signals rather than growth-play capabilities, like `consent`.
**Decision:** Added two more `SignalCategory` members (additive, flagged for FE sign-off): `session_replay` (Quantum Metric verified, plus FullStory, Hotjar, Contentsquare, Clarity, LogRocket, Mouseflow, Glassbox) and `bot_defense` (PerimeterX verified, plus DataDome, Cloudflare Turnstile, Kasada, Imperva). Both map to `ALL_PLAYS` as cross-cutting context, consistent with `consent`/`platform`; the rubric owner refines play semantics later. Bot-defense detection is inherently partial: much is server-side or cookie-based, and a block can hide the vendor's own scripts.
**Alternatives considered:** Shoehorn into `identity` (rejected — corrupts the CDP-absence signal). Note-only without adding (the user chose to add these two; the Oracle/ATG platform row stays documented-not-added by contrast, and BigCommerce/CMP live-validation stay deferred).

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
