# Data Contracts

## The inspector contract (pointer)

[`src/types.ts`](../src/types.ts) is the single source of truth — it is the FE/inspector contract, written before the implementation, and the implementation follows it. Do not duplicate its shapes here or anywhere else. The load-bearing pieces:

- `Signal` — `mechanism_present` × `evidence_of_use` × `observability` are three independent axes. The render-rule table (bottom of `types.ts`, "The render rule") maps every combination to allowed FE copy; do not collapse them.
- `InspectorEvent` — the streamed union. `signal.found` may **re-emit** a signal with an upgraded tier and merged evidence; consumers key by `signal.id` and replace. Category rollups arrive as `<category>.__rollup` ids during `classify`.
- `VendorEntry` — `present`-tier detection is a table, not code. Prefer `scriptUrlPatterns` (streams per-request) over `globalNames` (invisible until `settled`).
- `WiredMatcher` — hand-written per vendor, only against a traffic-verified beacon shape.
- `Runner.observe(url, signal?)` — `AsyncIterable<ObservedEvent>`; never a promise-of-batch.

Stable signal IDs: extend, never rename — the FE may key copy off them. Convention `<surface>.<category>.<vendor|aspect>` (e.g. `cart.esp.klaviyo`, `ads.pixel.meta`, `cart.email_capture.presence`).

## Wire formats (prose — not enforced by code)

- **SSE frames:** exactly `event: <type>\ndata: <json>\n\n`. The blank line terminates the frame. Route must set `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`, then `res.flushHeaders()`; no compression middleware on this route.
- **CLI `--json`:** raw NDJSON of `InspectorEvent`s — the FE dev's reference payload for real event sequences.
- **Probe fixtures:** `fixtures/probe-<site>.json`, the dumped output of `bc-console-probe.js` (fired beacon URLs + present global names per site). Input to `wired` matcher authoring and the crawler-vs-probe verification diff.
