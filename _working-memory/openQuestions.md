# Open Questions

<!-- Things that are unresolved and should not be guessed at. -->
<!-- Agents encountering these should ask rather than assume. -->

From `handoff-detection-engine-build.md` (October-facing unless noted):

- **Licenses** for Omnibug and Blacklight Collector — still unverified, and this **blocks** the October breadth push (lift vs hand-roll ~70 decoders). `@duckduckgo/autoconsent` is resolved: **MPL-2.0**, verified 2026-07-15, commercial-friendly as a dependency (see `decisionLog.md`).
- **Does the client know their affirmed signal list is half-unobservable** under their own observe-only decision? Signals 4–6 (and halves of 2 and 5) can only be "needs a deeper audit," not gap findings. Surface now, framed as the demo CTA.
- **Rubric owner** — unnamed. The tiers need a quality axis (a blanket 10%-off modal should score _worse_ than nothing); schema must be able to carry it when it lands.
- **QA corpus owner** — unnamed. Ground truth requires actually abandoning carts and waiting 24h; more hours than anyone estimates.
- **FE schema sign-off** on `src/types.ts` — cheap now, expensive in September.
- **Launch date** — late October is inferred from BFCM runway, not confirmed.
- **Geo** — crawl IP determines which consent banners and geo-gates appear; simulated-location support (Blacklight offers Ohio/California/Europe) is open even with accept-all decided.
- **Commercial tag-auditing tools** (ObservePoint, DataSlayer, Trackingplan, WASP) — never searched; real build-vs-buy question.
- **Build-order sequencing flag for the team:** under observe-only, Retargeting Suppression is nearly free and Cart Recovery is the most damaged play — Retargeting Suppression has a real claim on slot 1. Not this package's call; raise it.

October — Shopify rubric branch:

- **`ObservedGlobals` is presence-only** (`Record<string, boolean>`) by decision (2026-07-15) — reading global _values_ means serializing arbitrary objects out of `page.evaluate` for no prototype gain. `window.Shopify` existing is the platform entry. When the Shopify rubric branch lands (native Klaviyo integration emits `Started Checkout` server-side, so client-side event presence is less discriminating), revisit whether platform detection needs to read global values or richer `platform_inference` evidence — the `DetectionMethod` value exists but has no matcher shape yet.

Gaps surfaced by the 2026-07-15 PDP/homepage batch crawl (19 real sites, see `crawl-results/`):

- **Bot-blocking is the enterprise-reach limiter.** 8 of 19 pages returned 403/503 to headless Chromium (Solo Stove, Kate Spade, Calvin Klein, Columbia PDP, Tommy Hilfiger). Points at residential proxies / a stealth plugin / the real-browser extension — October, and it pairs with consent handling (same sites gate both ways).
- **Oracle Commerce / ATG platform fingerprint is missing.** L.L.Bean (`/llb/shop/` stack) detected 12 marketing vendors but `platform: none`. Add the row against its captured traffic in `crawl-results/pdp-batch.ndjson`.
- **BigCommerce fingerprint still unvalidated** — the one BC candidate (Solo Stove) bot-blocked; need a reachable BC site.
- **CMP rows unvalidated on a live site.** Added and unit-tested, but Columbia's homepage did not trigger one on re-crawl. Confirm against a known-OneTrust/Cookiebot site.

Immediate (blocks prototype step 0):

- `bc-console-probe.js` — user is providing it (not in workspace; do not recreate).
- The 3 target site URLs, including which is the hero site (its ESP's `wired` matcher is never-cut).
