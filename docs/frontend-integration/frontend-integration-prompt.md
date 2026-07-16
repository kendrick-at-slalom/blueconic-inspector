# Frontend Integration Prompt: wire @bc/inspector output into the existing UI

Hand this to your coding agent. You already have the inspector's `types.ts`; that file is the single source of truth for every shape below. Import from it, never redefine it.

---

## Where you're starting from, and what this is (and isn't)

You already have a working UI: a URL input, result sections, and spinners, populated right now with hard-coded placeholder results. **Keep all of that.** The tool behind it is real now, and this document is its output contract. Your job is to replace the placeholder data with the tool's real output shape and make the rendering honor the real detection tiers. You are not rebuilding the UI, and you are not calling the service yet.

Scope, precisely:

- **In:** adapt the existing components to consume the `InspectorEvent` / `Signal` shape, fed by a local mock stream you replay from a recorded sequence. Make the tier and absence rendering correct.
- **Out (do not do yet):** calling the inspector as a service, SSE / EventSource, any network or auth code. That drops in later, behind the seam you leave.

## The one hard constraint

**Adapt, don't rebuild. Do not break or restyle the existing UI.** Change the data source and the per-result render logic only; leave layout, styling, components, and section structure alone. Start by reading the code: find where the hard-coded results live and how they flow into the sections and spinners. You are replacing that source and tightening the render, nothing more. If the real shape doesn't map cleanly onto an existing component, stop and ask rather than restructuring the UI.

## Feed it from a mock stream (for now)

Replace the hard-coded results with a small module that replays a recorded sequence of `InspectorEvent`s: read a bundled NDJSON fixture and emit its lines on a timer (roughly 150–400ms apart) to simulate live streaming. Everything downstream (the store, sections, and spinners) then behaves exactly as it will against the live tool.

**Leave one seam.** The UI consumes an `AsyncIterable<InspectorEvent>` (or a subscribe callback); both the mock stream now and the real adapter later implement that same interface. When the service is ready you swap the one source module and touch nothing else.

## The output shape

`InspectorEvent` is a discriminated union on `type` (all in `types.ts`):

- `inspection.started` — `{ inspectionId, url, ts }`. Begin the global loading state.
- `phase.started` / `phase.completed` — `{ phase, ts }`, where `phase` is `resolve | fetch | render | collect | classify | score`, named for humans. Drive progress copy off these.
- `signal.found` — `{ signal, ts }`. One detected finding. See rule 1.
- `inspection.completed` — `{ inspectionId, summary, ts }`. Stop spinners, render final state. `summary` has `signalCount`, `byPlay`, `observableAbsences`, `unobserved`, `durationMs`.
- `inspection.failed` — `{ inspectionId, reason, recoverable, ts }`. Error state; retry only when `recoverable`.

A `Signal` carries `id`, `vendor`, `category`, `play[]`, and the three render axes: `mechanism_present`, `evidence_of_use`, `observability` (plus `confidence`, `evidence[]`, `evidence_total`, `notes`).

## Five rules you cannot get wrong

1. **Upsert signals by `signal.id`, never append.** A signal re-emits with an upgraded tier as more is learned (a vendor goes from "installed" to "actively firing"). Keep a `Map<signal.id, Signal>` and REPLACE on each `signal.found`. Append, and the same vendor shows as two contradictory results — likely worse than your current placeholders.

2. **Render copy from three independent axes, per the render rule.** Never collapse `mechanism_present`, `evidence_of_use`, and `observability` into one boolean. The table (also in `types.ts`):

   | mechanism_present | evidence_of_use | observability             | Copy                                      |
   | ----------------- | --------------- | ------------------------- | ----------------------------------------- |
   | true              | `wired`         | `observable`              | "X is live"                               |
   | true              | `none`          | `observable`              | "X installed, no evidence it fires" ★     |
   | true              | `unobservable`  | `observable`              | "X installed, couldn't verify use"        |
   | false             | `none`          | `observable`              | "No X detected" (flat, safe claim)        |
   | any               | any             | `unobserved`              | "We couldn't detect X" (always hedge)     |
   | any               | any             | `requires_interaction`    | "Needs a deeper audit" (a CTA, not a gap) |
   | any               | any             | `not_observable_from_url` | "Needs a deeper audit" (a CTA)            |

   ★ is the product's core claim. Render it as "installed, no evidence it fires," never "you have X." Your hard-coded results probably show a simple present/absent; this axis set is the real thing, so the render is where most of the adaptation work is.

3. **`unobserved` is never absence.** A blocked or failed crawl reports categories as `observability: 'unobserved'`. That must look different from a real "No X detected." One says "we couldn't see," the other says "it isn't there." Same visual is a lie.

4. **`evidence_total` (any "×N" you show) is a snapshot at the moment a signal reached its tier, not a count of events.** Don't render it as "N events." Faint activity hint, or omit.

5. **Category rollups mark empty sections.** Signals whose id ends `.__rollup` (`mechanism_present: false`) arrive during `classify` and mean "this whole category matched nothing." Use them to resolve a section from loading to its empty state; their `observability` picks which empty copy (rule 3).

## Mapping your sections

Your UI already groups results into sections. Map those sections onto one of the two axes every `Signal` carries:

- **`category`** (clean 1:1, recommended): `esp`, `sms`, `exit_intent`, `ad_pixel`, `recs`, `identity`, `platform`, `loyalty`, `email_capture`, `consent`, `session_replay`, `bot_defense`. A vendor is in exactly one, so sections don't duplicate.
- **`play`** (`play: PlayId[]`, many-to-many): `cart_recovery`, `order_value_expansion`, `retargeting_suppression`, `churn_winback`, `intelligent_prospecting`. Business "growth plays"; a signal can appear under several. `summary.byPlay` gives per-play counts for headers.

If your existing section labels differ, keep your labels and map ids to them. A starter, if you need one:

```
esp: "Email", sms: "SMS", exit_intent: "On-site capture", ad_pixel: "Ad pixels",
recs: "Recommendations", identity: "Customer data platform", platform: "Commerce platform",
loyalty: "Loyalty & subscriptions", email_capture: "Email capture", consent: "Consent",
session_replay: "Session replay", bot_defense: "Bot defense"
```

## Spinners you already have

Drive them off the stream's `phase` events instead of a fixed delay:

- **Global**: loading from `inspection.started` until `inspection.completed` / `inspection.failed`.
- **Progress copy**: map the current `phase` to human text; a crawl runs ~25–50s, so this carries the wait.
- **Per-section**: spin while the inspection runs and the section has no signals yet; resolve when a real signal lands in it or its `.__rollup` arrives (rollups come late, at `classify`). On `inspection.completed`, force-resolve any still-empty section.
- **Nice moment, not required**: the present→wired upgrade (rule 1) animating a result from "installed" to "live" as it happens.

## Deferred — leave the seam, don't build it yet

- The live service call. Later it's either the in-process generator (`for await (const e of inspect({ url }))`) or SSE (`new EventSource('/inspect?url=' + encodeURIComponent(url))`). SSE gotcha for when you get there: the server sends NAMED events, so use `addEventListener('signal.found', …)`, not `onmessage`; `JSON.parse(e.data)`; close on completed/failed.
- Retry, auth, and error infrastructure beyond a basic failed state.

## Build order for your agent

1. Read the code. Find the hard-coded results and the components that render them. Report the mapping from the current placeholder shape to our `Signal` shape, and where the source seam goes. Wait for a nod before changing anything.
2. Drop in the mock-stream module (replays the NDJSON fixture) behind the seam.
3. Store: `Map<id, Signal>` with upsert; derive grouped sections and per-section loading from it plus phase/completion events.
4. Tighten the per-result render to the render rule (rule 2); wire the existing spinners to phases. Keep the visuals identical.
5. Verify the existing screen now streams real-shaped data in, upgrades and empty-section rollups included, with no visual regression.

## The fixture to replay

Ask the inspector team for a sample NDJSON of a real inspection, or if you have the repo, generate one deterministically (no live crawl, no flakiness):

```
npm run inspect -- --har docs/beacon-capture/magicspoon-beacons.json --json > sample-inspection.ndjson
```

Each line is one `InspectorEvent`. A representative slice:

```
{"type":"inspection.started","inspectionId":"insp_x","url":"https://…","ts":1}
{"type":"phase.started","phase":"fetch","ts":2}
{"type":"signal.found","signal":{"id":"cart.esp.klaviyo","vendor":"klaviyo","category":"esp","play":["cart_recovery","churn_winback"],"mechanism_present":true,"evidence_of_use":"none","observability":"observable","method":"network","confidence":0.6,"evidence":[{"kind":"script","detail":"https://static.klaviyo.com/…","timestamp":3}],"evidence_total":1},"ts":3}
{"type":"signal.found","signal":{"id":"cart.esp.klaviyo","evidence_of_use":"wired","observability":"observable","mechanism_present":true,"notes":"Behavioral event fired.","…":"SAME id — REPLACE the result, don't add one"},"ts":9}
{"type":"signal.found","signal":{"id":"identity.__rollup","vendor":null,"category":"identity","mechanism_present":false,"evidence_of_use":"none","observability":"observable","evidence":[],"evidence_total":0,"notes":"No vendor detected in this category."},"ts":40}
{"type":"inspection.completed","inspectionId":"insp_x","summary":{"signalCount":9,"byPlay":{"cart_recovery":3},"observableAbsences":["exit_intent","identity"],"unobserved":[],"durationMs":8000},"ts":41}
```

The two `cart.esp.klaviyo` lines have the same id, the second upgraded: that's rule 1 in the wild, and it's the behavior your current hard-coded results almost certainly don't handle.
