# Antipatterns

<!-- Negative knowledge. Things the team tried that didn't work, captured so   -->
<!-- agents and humans don't re-litigate closed loops. Append-only, like        -->
<!-- decisionLog.md.                                                            -->

## 2026-07-16 — Don't assume `puppeteer-extra-plugin-stealth` masks the UA under `playwright-extra`

**Tried:** Ran the live `--active-browse` path (stealth applied via `chromium.use(StealthPlugin())`) expecting it to spoof enough headless tells to fire Klaviyo's Viewed-Product beacon and Attentive.
**What broke:** Both stayed `present` even with the flag ON. An outbound Google Ads beacon in the same session carried `uafvl=HeadlessChrome;149...` — the User-Agent still announced HeadlessChrome, so the not-a-bot gate failed. The plugin patched some fingerprints but not the UA string in this Playwright wiring. (Meta and Rebuy upgraded anyway — they aren't UA-gated the same way.)
**Why we backed out:** The opt-in stealth path is necessary but not sufficient for the interaction-gated Shopify vendors; it needs an explicit UA / client-hints override on top. That's the offered-not-started next step.
**Don't suggest:** Claiming the stealth flag alone makes Klaviyo/Attentive reach `wired` live. Verify the outbound UA (check any beacon's `uafvl` or the UA header) before assuming masking worked; demo those two via HarRunner replay until the UA override lands. Also note the live A/B was a single pair — don't treat one green run as proof either.

## 2026-07-16 — Don't read the CLI `×N` (or `evidence_total`) as a count of beacons fired

**Assumed:** that `[wired] cart.esp.klaviyo ×36` meant 36 Klaviyo beacons fired, and Meta's `×2` meant only 2 did. Meta's low number read as a bug, since the Magic Spoon capture holds 18 `/tr` beacons.
**Why it's not:** `evidence_total` is a SNAPSHOT taken when a signal last upgraded tier, not a running total. Signals re-emit only on tier upgrade (contract), so beacons after the upgrade bump the internal count silently and never move the emitted number. Meta upgrades present→wired on its first `/tr` (count 2 at that instant), and the other 17 accumulate without re-emitting. Klaviyo's `×36` is the count of every prior match, script and asset loads included, at the moment its first behavioral beacon landed. The count also double-counts where a vendor's present-tier script pattern overlaps its own beacon URL (Meta's `facebook.com/tr` is both a present pattern and the wired beacon).
**Don't suggest:** rendering `evidence_total` as "currently N" or "N events" (types.ts says as much), or treating a low `×N` on a busy vendor as a missed-beacon bug. Read it as activity depth at the upgrade instant. A true event tally, if it's ever needed, is a new counter, not this field.

## 2026-07-15 — Don't expect `wired` from a bare headless crawl on Shopify+Klaviyo

**Tried:** An active-browse spike: headless Chromium on a Magic Spoon PDP with simulated scroll/mouse/dwell (~55s), no cart.
**What broke:** Only `client/sessions` fired; the discriminating `client/events` (Viewed Product) never did. Klaviyo gates Active-on-Site/Viewed-Product on not-being-a-bot, and headless sets `navigator.webdriver = true`.
**Why we backed out:** Making it fire needs stealth (spoofing headless tells), which is bot-detection evasion, gated behind an explicit opt-in (default off), never a default.
**Don't suggest:** Expecting Klaviyo (or any interaction-gated vendor) to show `wired` on a plain headless crawl. Without the opt-in stealth flag a Shopify+Klaviyo store reads `present`/`none` live; demo `wired` via HarRunner replay or the opt-in stealth path.

## 2026-07-15 — Don't wire Klaviyo `client/sessions` as the `wired` signal

**Tried:** Considered wiring `a.klaviyo.com/client/sessions` (the one beacon that fires on every crawl) so at least one Shopify store shows `wired`.
**What broke:** `client/sessions` is onsite-tracking init; it fires on nearly every Shopify+Klaviyo store regardless of whether flows are live. Wiring it reintroduces the "every Shopify store looks capable" problem the present/wired split exists to prevent.
**Why we backed out:** The discriminating beacons are `client/events` (behavioral) and `client/profiles` (identity); the matcher targets those.
**Don't suggest:** Treating a vendor's session-init or script-load beacon as `wired`. Wired needs a behavioral or identity beacon verified from real traffic.

## 2026-07-15 — Don't shape the runner as `observe(url): Promise<Observation>`

**Tried:** Proposed in plan draft 1 (implicitly, via an unspecified "async queue").
**What broke:** Every test passes, the generator and SSE are real, and progressive streaming doesn't exist — signals dump at once after a 5–25s block. The FE is built against the assumption it streams.
**Why we backed out:** Caught in plan review round 2; named the single most likely way to ship broken-but-green.
**Don't suggest:** Any runner shape that resolves once. `Runner.observe` returns `AsyncIterable<ObservedEvent>` (see `src/types.ts`); the callback→AsyncIterable queue needs a promise-parked `next()` and a done sentinel.

## 2026-07-15 — Don't write `wired` matchers from remembered endpoint shapes

**Tried:** Plan draft 1 wrote Klaviyo/Meta matchers from training-data recall at hour 4 and verified against live traffic at hour 8.
**What broke:** Verification landed last, blocked on the user, with no buffer; wrong guesses produce confidently false findings — the exact failure mode the rubric exists to prevent.
**Why we backed out:** Plan review round 1 moved verification to hour zero (the probe run).
**Don't suggest:** Authoring any beacon matcher without a probe fixture for that vendor. Unverified vendors ship `evidence_of_use: 'unobservable'`.

## 2026-07-15 — Don't gate the streaming check on timestamp spread across all signals

**Tried:** Plan draft (round 2) verified streaming by diffing `ts` across all `signal.found` events, failing if they clustered within ~50ms.
**What broke:** The tail is bursty by construction — globals/DOM matchers and absence rollups all fire at `settled` — so a working pipeline false-fails and you burn hours debugging a queue that's fine.
**Why we backed out:** Plan review round 3 replaced the gate with the actual claim: at least one `signal.found` before `phase.completed` for `collect`.
**Don't suggest:** Timestamp-spread as a pass/fail streaming gate. It's a soft signal only. If the real gate fails, check script-driven vs globals-driven detection before suspecting the queue bridge.

## 2026-07-15 — Don't assert category-wide negatives about prior art without searching

**Tried:** An earlier session asserted "nobody has published a library that knows these event shapes."
**What broke:** Wrong on the ad-pixel half — Omnibug had published ~70 vendor decoders for years. The user caught it by asking "really?"
**Why we backed out:** Corrected in `handoff-event-inspection-ecosystem.md`, which now marks verified vs assumed per claim.
**Don't suggest:** Coverage claims (positive or negative) about the vendor-decoder ecosystem without checking Omnibug's supported-tags list and the ecosystem handoff first. Mark what's verified vs remembered; say "I haven't checked" out loud.
