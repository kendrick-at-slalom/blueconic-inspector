# Antipatterns

<!-- Negative knowledge. Things the team tried that didn't work, captured so   -->
<!-- agents and humans don't re-litigate closed loops. Append-only, like        -->
<!-- decisionLog.md.                                                            -->

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
