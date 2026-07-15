# Open Questions

<!-- Things that are unresolved and should not be guessed at. -->
<!-- Agents encountering these should ask rather than assume. -->

From `handoff-detection-engine-build.md` (October-facing unless noted):

- **Licenses** for Omnibug, Blacklight Collector, and `@duckduckgo/autoconsent` — unverified, and this **blocks** the October breadth push (lift vs hand-roll ~70 decoders).
- **Does the client know their affirmed signal list is half-unobservable** under their own observe-only decision? Signals 4–6 (and halves of 2 and 5) can only be "needs a deeper audit," not gap findings. Surface now, framed as the demo CTA.
- **Rubric owner** — unnamed. The tiers need a quality axis (a blanket 10%-off modal should score *worse* than nothing); schema must be able to carry it when it lands.
- **QA corpus owner** — unnamed. Ground truth requires actually abandoning carts and waiting 24h; more hours than anyone estimates.
- **FE schema sign-off** on `src/types.ts` — cheap now, expensive in September.
- **Launch date** — late October is inferred from BFCM runway, not confirmed.
- **Geo** — crawl IP determines which consent banners and geo-gates appear; simulated-location support (Blacklight offers Ohio/California/Europe) is open even with accept-all decided.
- **Commercial tag-auditing tools** (ObservePoint, DataSlayer, Trackingplan, WASP) — never searched; real build-vs-buy question.
- **Build-order sequencing flag for the team:** under observe-only, Retargeting Suppression is nearly free and Cart Recovery is the most damaged play — Retargeting Suppression has a real claim on slot 1. Not this package's call; raise it.

October — Shopify rubric branch:

- **`ObservedGlobals` is presence-only** (`Record<string, boolean>`) by decision (2026-07-15) — reading global *values* means serializing arbitrary objects out of `page.evaluate` for no prototype gain. `window.Shopify` existing is the platform entry. When the Shopify rubric branch lands (native Klaviyo integration emits `Started Checkout` server-side, so client-side event presence is less discriminating), revisit whether platform detection needs to read global values or richer `platform_inference` evidence — the `DetectionMethod` value exists but has no matcher shape yet.

Immediate (blocks prototype step 0):

- `bc-console-probe.js` — user is providing it (not in workspace; do not recreate).
- The 3 target site URLs, including which is the hero site (its ESP's `wired` matcher is never-cut).
