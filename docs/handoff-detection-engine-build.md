# Handoff — Detection Engine (`@bc/inspector`)

**Written:** 2026-07-15
**For:** Claude Code, starting the build.
**Owner:** 1 of 3 devs. This package only. Frontend and simulation are other people's tracks.
**Ship target:** build + QA complete late October 2026 (BFCM campaign runway, not Black Friday itself).
**Prototype target:** ~24h from writing. **This package is required for it.** See "The 24h prototype" below for the cut-line — depth gets cut, the pipeline doesn't.

---

## Read first, don't re-derive

Project context (client, five Phase 1 plays, build order, tiers) lives in the project's custom instructions. Prior artifacts:

- `cart-recovery-discovery-session.md` — historical. Session held 2026-07-15.
- `cart-recovery-simulation-options.md` — sibling track. Consumes this package's output; doesn't block it.
- `handoff-event-inspection-ecosystem.md` — **prior art research. Read this before choosing any dependency.** Covers Blacklight Collector, Omnibug, Wappalyzer forks, Tracker Radar/EasyList, and what's verified vs. assumed.

---

## What this package is

A URL goes in. Structured findings about a prospect's ecommerce growth-play readiness come out, **streamed as they're discovered**, not batched at the end.

It is a library first, a service second. The frontend consumes it as an external dependency.

**Two run modes, one core:**

1. **In-process** — imported directly, emits events. For localhost demos and tests.
2. **Service** — HTTP + SSE. For AWS or wherever.

The core must be transport-agnostic. If transport concerns leak into detection logic, the local demo and the deployed service will drift and you'll debug both.

---

## The constraint that defines the design

**Observe-only.** Decided 2026-07-15.

No add-to-cart. No checkout. No login. No cart mutation. Load pages, watch what happens, record it.

**One sanctioned exception, decided 2026-07-15: always "accept all" on GDPR/cookie consent banners.** Rationale: consent-gated tags don't fire otherwise, and declining systematically under-detects EU sites — the false-negative machine. The crawler is consenting to its own tracking; no shopper's data is involved. Capability detection wants the maximal stack. Document it as a sanctioned exception so it isn't later mistaken for scope creep against observe-only.

Consequences to build in:

- **Findings describe the full-consent experience.** An EU shopper who declines sees a smaller stack. That's fine — the tool's claims are about _capability existing_, not about what every visitor experiences — but the inspection record must carry consent context so nobody misreads it.
- **Capture the consent event itself as data:** banner present? CMP vendor (OneTrust, Cookiebot, TrustArc, IAB TCF...)? accepted at what timestamp? Tag every signal `pre_consent` or `post_consent`. Pre-consent firing is real signal about the prospect's stack — record it, but **don't** editorialize it into a compliance finding. We are not a GDPR audit tool, and drifting into one is scope creep with legal review attached.
- **Sequencing inside the crawl:** detect banner → accept → _then_ settle/wait for the tag cascade. Accepting late or racing the cascade double-counts or under-counts.

Implementation: `@duckduckgo/autoconsent` handles CMP interaction programmatically and supports opt-in mode — it's the right shape and lifts the per-CMP selector maintenance. **License unverified; same gate as Omnibug/Blacklight.** Fallback: hand-rolled selectors for the top 3 CMPs, which is also the honest prototype-scope version if any target site throws a banner.

Beyond consent, the wider decision remains revisitable if a simple interaction unlocks big value — the team explicitly left that door open — but **do not build for it speculatively.** Design the schema so interaction-gated signals are representable and honestly reported as unavailable, then stop.

### What this costs, so you're not surprised

- Cart-side signals collapse to "vendor is installed" — which is Tier `present`, and Tier `present` **does not count as capability**. See rubric below.
- Cart-abandonment modals are uncapturable. No cart, no modal.
- **Pixels are unaffected.** They fire on pageview: `fbq('track','PageView')`, GA4 `page_view`. No interaction needed. Retargeting Suppression's whole signal set is fully observable.
- PDP recommendation modules render on load. Order Value Expansion's PDP surface survives; its cart surface doesn't.

**Sequencing consequence worth raising with the team:** the build order has Cart Recovery at slot 1 as "most observable." Under observe-only that's no longer true — Cart Recovery is the play _most_ damaged, and Retargeting Suppression is untouched and nearly free (Omnibug already has decoders for Meta, TikTok, Google Ads, Criteo, Trade Desk, Reddit, Pinterest, Snap, Bing, Amazon). Retargeting Suppression has a real claim on slot 1 now. Not this package's call, but flag it.

---

## The 24h prototype — this package is required

The prototype needs a real, live inspector. The URL input **is** the product; the first thing anyone does in a demo is type their own company's URL, and canned screenshots die on contact. The frontend dev is also blocked on the event contract until it exists.

So: **cut depth, never the pipeline.** Build the whole spine end-to-end on real URLs with three hand-written detectors. Everything below is corner-cutting with a reason attached.

### Hour budget (~8–12 working hours realistically)

| Hours     | What                                                                                                                         | Why                                                            |
| --------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 0:00–0:30 | Schema only. Write `types.ts`, hand to FE dev.                                                                               | Unblocks another human. Highest leverage 30 min in the sprint. |
| 0:30–1:30 | Scaffold: Playwright launches, loads URL, captures requests + page globals, emits events, async iterator. One stub provider. | Proves the stream before any detection logic exists.           |
| 1:30–2:00 | SSE wrapper. Express, one route, ~30 lines.                                                                                  | FE can hit a real endpoint.                                    |
| 2:00–4:00 | **`present`-tier breadth: ~30 vendors.** Port the arrays from `bc-console-probe.js`.                                         | Cheap. This is a table, not a feature.                         |
| 4:00–6:00 | **`wired` tier for Klaviyo + Meta only.** Verify beacon shapes by hand against the hero site.                                | The expensive part. Two is enough to prove the tier.           |
| 6:00–8:00 | Run against 3 real target sites. Fix what breaks.                                                                            | It will break.                                                 |
| 8:00+     | Buffer. It gets used.                                                                                                        |

**Cut order when it slips:** `wired` for Meta → SSE (fall back to in-process, FE imports directly) → `present`-tier vendors beyond the hero site's stack. **Never cut:** the schema, the event stream, `wired` for whichever ESP the hero site actually runs.

### Provider strategy: wide at `present`, narrow at `wired`

The costs are not symmetric and the prototype should exploit that.

- **`present` is a string match.** Vendor global exists, or a script URL matched. ~30 vendors ≈ 30 array entries. Do not ration these.
- **`wired` needs a verified beacon shape per vendor.** Real work, real hours, and wrong guesses produce confidently false findings. Ration these hard.

The schema already encodes the asymmetry: a vendor with no verified beacon pattern returns `mechanism_present: true, evidence_of_use: 'unobservable'`. Honest, representable, and it degrades into "we couldn't tell" rather than a false `absent`.

**Seed the arrays from `bc-console-probe.js`** (in outputs) — it already carries working global-name and beacon-URL lists. Caveat carried with it: those names are from memory and vendors rename things. If a site known to run Attentive returns empty, suspect the list before the site.

Minimum seed list, grouped by why it earns its place:

| Group                      | Vendors                                                                                                 | Why                                                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **ESP / SMS**              | Klaviyo, Attentive, Postscript, Listrak, Bluecore, Braze, Iterable, Omnisend, Sendlane, Yotpo SMS       | Cart Recovery's back half. The published gap.                                                                                               |
| **Exit-intent**            | Justuno, OptiMonk, Wunderkind/BounceX, Privy, Sleeknote, Sumo                                           | On-site recovery. Also: whichever one fires the hero's modal is the demo.                                                                   |
| **Ad pixels**              | Meta, TikTok, Google Ads, GA4, Criteo, Trade Desk, Pinterest, Snap, Bing UET, Reddit, Amazon, RTB House | Retargeting Suppression, nearly free. **Count is the visual** — "trapped in email while paying six ad networks" needs all of them, not one. |
| **Recommendations**        | Nosto, Dynamic Yield, Rebuy, LimeSpot, Searchspring, Klevu                                              | Order Value Expansion's PDP surface, which survives observe-only.                                                                           |
| **Platform**               | Shopify, BigCommerce, SFCC, Magento, WooCommerce                                                        | Rubric branch (Shopify's server-side `Started Checkout`).                                                                                   |
| **CDP / identity**         | **BlueConic**, Segment, mParticle, Tealium, RudderStack, Lytics                                         | BlueConic is the hard disqualifier — see `bc-console-probe.js`, it zeroes the score.                                                        |
| **Loyalty / subscription** | Recharge, Smile.io, LoyaltyLion, Yotpo Loyalty, Skio                                                    | Free at `present`, and it's the entire input to the Tier-2 Churn/Win-back readiness assessment. Collect it now, use it in the fast-follow.  |

That last row is worth noticing: the readiness signals for a fast-follow play cost one array entry each while the crawler is already on the page. Don't leave them for later.

### The corner that cuts itself

**Don't lift Omnibug for the prototype.** Hand-write three providers instead. Reading and clearing a license takes longer than writing three request matchers, and the license question is genuinely blocking. Sidestep it now, resolve it properly before the October breadth push.

### The corner you cannot cut

**Skip Blacklight's stack-trace attribution — but the tier distinction survives anyway.** This matters and it isn't obvious:

You do _not_ need stack traces to separate `present` from `wired`. Pure request interception gets you there, because the network shape tells you:

- `klaviyo.js` loads, nothing else → **`present`**. Not capability.
- A Klaviyo `track` or `identify` request fires → **`wired`**. Something is actually happening.

Playwright's `page.on('request')` is enough. `confirmed` — trigger _with_ identity bound — likely needs the attribution layer and stays out of the prototype. That's fine. **`present` vs. `wired` is the whole Klaviyo-on-every-Shopify-store argument**, and it's the thing the demo has to prove the tool can do. If the prototype flattens that distinction, it's demoing the broken version of the product.

### Cut without ceremony

Wappalyzer / platform fingerprinting. Tracker Radar / EasyList — hardcode domain matching. Fixtures and CI. Fargate, Lambda, any deployment at all. Full `FailureReason` taxonomy. Consent handling. Rate limiting.

Local only. `node cli.js https://…`. Localhost is the demo target.

### What the demo shows

Type a real retailer's URL, watch signals stream in live, land on findings like _"Klaviyo installed, no evidence of cart events firing"_ and _"no on-site recovery mechanism detected."_

That's the product's actual claim, running for real, on their real site. It's a smaller demo than a fake one and a much better one.

---

## Client-affirmed signal manifest (Cart Recovery)

Affirmed by BlueConic 2026-07-15, explicitly "not limited to" these. This is the canonical starting list for `providers/` — but map it against observe-only before estimating, because **the list and the crawl posture were decided by the same client and they conflict**:

| #   | Signal                                                                                              | Observability under observe-only                                                                                                                                                                                                                                         |
| --- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Exit-intent capability (Justuno, OptiMonk, Wunderkind, Bounce Exchange, Privy, custom `mouseleave`) | **Split.** Vendor script presence: `observable`. Custom `mouseleave` listeners: detectable via listener enumeration without firing them (CDP `getEventListeners`-style) — `observable`, but confirming _behavior_ means synthesizing the event → `requires_interaction`. |
| 2   | Email capture **before payment**                                                                    | **Split.** Newsletter/modal capture on homepage/PDP: `observable`. The _ordering claim_ — captured before the payment step — requires walking checkout → `requires_interaction`.                                                                                         |
| 3   | ESP/SMS presence (Klaviyo, Attentive, Postscript, Listrak, Bluecore, Braze)                         | `observable`. Prototype covers Klaviyo.                                                                                                                                                                                                                                  |
| 4   | Cart recovery link/UTM patterns, if exposed                                                         | **Mostly `not_observable_from_url`.** These live in recovery emails we'll never receive. Heuristic at best (cart-restoration endpoints, `?utm_campaign=abandoned*` handling); low confidence, mark it honestly.                                                          |
| 5   | Checkout step count + guest checkout availability                                                   | `requires_interaction`. No way to count steps without walking them.                                                                                                                                                                                                      |
| 6   | Ad suppression for a previously converted cart                                                      | `not_observable_from_url` — full stop. Requires a _conversion_, which is beyond even the "add to cart and observe" fallback the team reserved. Deepest signal on the list.                                                                                               |

Three consequences:

- **Signals 4–6 are why the schema's `requires_interaction` / `not_observable_from_url` states exist.** The tool reports them as "needs a deeper audit," and that's not a weakness — it's the demo-request CTA with a concrete reason attached. The unobservable half of this list _is_ the lead-gen hook.
- **Signal 6 is Retargeting Suppression's core, filed by the client under Cart Recovery.** The play boundaries blur on the client side too — same pattern as Product Recommendations appearing under cart recovery in their capability screenshot. Model signals as many-to-many with plays (`play: PlayId[]` already allows this); don't fight their taxonomy.
- **Prototype scope is unaffected.** The three chosen providers (Meta pixel, Klaviyo, one exit-intent vendor) sit entirely in the observable half. Signals 1-partial, 2-partial, 4, 5, 6 are October questions, and mostly _rubric_ questions rather than detector questions.

Stable IDs for the manifest (extend, don't rename): `cart.exit_intent.<vendor>`, `cart.exit_intent.custom_listener`, `cart.email_capture.presence`, `cart.email_capture.pre_payment`, `cart.esp.<vendor>`, `cart.sms.<vendor>`, `cart.recovery_link.heuristic`, `checkout.step_count`, `checkout.guest_available`, `ads.suppression.post_conversion`.

---

## The data model — get this right first

Everything else is mechanical. This is the part that, if wrong, makes honest copy impossible downstream.

### The core distinction

**`absent` ≠ `unobserved` ≠ `not observable`.** Three different things. The frontend's language rule depends on telling them apart:

- `absent` — we looked, it's not there. → "You don't have X." Safe claim.
- `unobserved` — we looked and couldn't tell. → "We couldn't detect X." Hedged.
- `requires_interaction` — structurally invisible under observe-only. → "This needs a deeper audit." Not a gap claim at all.

If the schema can't carry this, no language rule the team agrees on can be honored. This was flagged repeatedly in the discovery doc and it lands here, in code.

### Signal record

```ts
interface Signal {
	id: string; // stable, e.g. 'cart.esp.klaviyo'
	vendor: string | null; // 'klaviyo' | null if vendor-agnostic
	category: SignalCategory; // 'esp' | 'sms' | 'exit_intent' | 'ad_pixel' | 'recs' | 'identity' | 'platform'
	play: PlayId[]; // which plays consume this

	mechanism_present: boolean; // did the vendor's code load at all
	evidence_of_use: 'confirmed' | 'wired' | 'none' | 'unobservable';
	observability:
		'observable' | 'requires_interaction' | 'not_observable_from_url';

	method: 'network' | 'dom' | 'js_global' | 'platform_inference' | 'header';
	confidence: number; // 0..1
	evidence: Evidence[]; // raw substantiation — see below
	notes?: string;
}

interface Evidence {
	kind: 'request' | 'script' | 'dom_node' | 'global' | 'cookie';
	detail: string; // URL, selector, global name — enough to re-verify by hand
	attribution?: string; // originating script, if we have a stack trace
	timestamp: number;
}
```

`evidence` is not optional decoration. When a prospect's CTO says the audit is wrong, this array is the answer. It's also what the QA corpus diffs against.

### Rubric tiers

| Tier        | Observation                                                           | Capability? |
| ----------- | --------------------------------------------------------------------- | ----------- |
| `confirmed` | Trigger event fires **with** identified profile attached              | Yes         |
| `wired`     | Trigger fires, no identity binding — OR identity captured, no trigger | Partial     |
| `present`   | Vendor script loads, nothing else observed                            | **No**      |
| `absent`    | No vendor                                                             | No          |

**The Klaviyo problem this exists to solve:** Klaviyo is installed on essentially every Shopify store on earth. Its presence proves nothing about whether an abandoned-cart flow is live. If `present` scores as capability, the tool confidently tells serious retailers they're missing something they've run for years, and it's dead.

**Shopify caveat:** the native Klaviyo integration emits `Started Checkout` server-side. Client-side event presence is less discriminating there. Shopify likely needs a rubric branch — another argument for treating platform fingerprinting as a first-class path, not a fallback.

**Known rubric gap, not yours to solve alone:** these tiers are unidimensional. They assume more capability is better. But a site firing a blanket "10% off" modal at anonymous first-time visitors should score _worse_ than a site with nothing — it's training shoppers to abandon on purpose, and margin protection is BlueConic's actual pitch. The rubric needs a **quality axis**, not just a presence axis. Raise it with whoever owns the rubric; make sure the schema can carry a quality dimension when it lands.

---

## The frontend contract

The frontend needs to show progress on a 30–60s operation. Batching to the end is a blank screen.

### Event stream

```ts
type InspectorEvent =
	| {
			type: 'inspection.started';
			inspectionId: string;
			url: string;
			ts: number;
	  }
	| { type: 'phase.started'; phase: Phase; ts: number }
	| { type: 'signal.found'; signal: Signal; ts: number }
	| { type: 'phase.completed'; phase: Phase; ts: number }
	| {
			type: 'inspection.completed';
			inspectionId: string;
			summary: Summary;
			ts: number;
	  }
	| {
			type: 'inspection.failed';
			inspectionId: string;
			reason: FailureReason;
			recoverable: boolean;
			ts: number;
	  };

type Phase = 'resolve' | 'fetch' | 'render' | 'collect' | 'classify' | 'score';
```

Design notes:

- **`signal.found` fires as each lands**, not batched per phase. That's what makes the UI feel alive.
- Phases are named for humans. The frontend will surface them as copy ("Checking ad pixels…"). Name them accordingly.
- `inspection.failed` carries `recoverable` because "site behind Cloudflare" and "your URL is a 404" are different UX. Enumerate `FailureReason` properly — the discovery doc lists the cases (B2B site, no cart, SaaS page, 404, login wall, bot-blocked).
- **Silent under-report is the dangerous failure.** A crawl that fails but returns "no signals" looks like a finding. Any phase that fails must emit signals with `observability: 'unobserved'`, never `absent`.

### Two adapters, same events

```ts
// in-process — localhost, tests
import { inspect } from '@bc/inspector';

for await (const event of inspect({ url })) {
	/* ... */
}

// service — deployed
const es = new EventSource(`${BASE}/inspect?url=${encodeURIComponent(url)}`);
es.addEventListener('signal.found', (e) => {
	/* ... */
});
```

**Why SSE over WebSocket:** the stream is unidirectional (server→client), SSE survives proxies, auto-reconnects natively, needs no upgrade handshake, and is far simpler on Lambda/ALB. WebSocket is bidirectional overkill. Polling is worse UX and more infra. Revisit only if the frontend needs to send mid-inspection commands — it doesn't today.

Agree this schema with the frontend dev **before** writing detectors. It's the thing that's expensive to change and cheap to get right now.

---

## Architecture

```
packages/
  core/          # orchestration, phases, event emitter. No transport, no HTTP.
  providers/     # per-vendor detectors. The extensible surface.
  runner/        # browser control (Playwright). Swappable.
  service/       # HTTP + SSE wrapper. Thin.
  cli/           # local dev + QA corpus capture
fixtures/        # recorded HARs + DOM snapshots for deterministic tests
```

`core` must not import `service`. If it does, the local mode is a lie.

### Provider interface

The extensible surface. Everything net-new lands here.

```ts
interface Provider {
	id: string;
	vendor: string;
	category: SignalCategory;
	matchRequest?: (req: ObservedRequest) => Signal | null;
	matchDom?: (doc: ObservedDom) => Signal | null;
	matchGlobal?: (win: ObservedGlobals) => Signal | null;
}
```

Modeled deliberately on Omnibug's `src/providers` shape, so its decoders port with minimal translation.

### Runner: Playwright, not Puppeteer

Blacklight is Puppeteer-based (^22.x). Playwright is the better call for CDP access, request interception, and multi-context concurrency. **If we lift Blacklight's instrumentation _approach_ rather than its package, this decision is open — decide it deliberately, don't inherit it.**

Keep `runner` behind an interface. Browser choice should not leak into providers.

---

## What to lift vs. build

Full detail in `handoff-event-inspection-ecosystem.md`. Summary:

| Layer                                        | Source                                                  | Status                                                                                                                                     |
| -------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Ad pixel decoders                            | **Omnibug** `src/providers` (~70 vendors)               | Covers Meta, TikTok, Google Ads, Criteo, Trade Desk, Reddit, Pinterest, Snap, Bing, Amazon. **License unverified — check before lifting.** |
| Runtime instrumentation + script attribution | **Blacklight Collector** approach (`stacktrace-js`)     | Port the approach if using Playwright. **License unverified. The Markup is a nonprofit; this is a commercial lead-gen tool.**              |
| Platform fingerprinting                      | **Wappalyzer forks** (`tunetheweb`, `dochne`, `enthec`) | Tier-`present` machine by construction. Use for platform branch only. Fingerprint counts disputed across sources — verify, don't quote.    |
| Domain classification                        | **Tracker Radar** + **EasyList**                        | Free, maintained.                                                                                                                          |
| **ESP / SMS / exit-intent decoders**         | **Nobody. This is the build.**                          | Klaviyo, Attentive, Postscript, Listrak, Bluecore, Justuno, OptiMonk, Wunderkind, Privy. ~a dozen vendors.                                 |

The gap is not random: ad pixels are a commodity someone open-sourced; lifecycle messaging integration is what BlueConic sells. The thing we have to build is the thing they're selling.

**Also add BlueConic itself to the dictionary.** Listeners, Dialogues, and Product Recommendations install on customer sites — BlueConic has a fingerprint. What does the tool do when a customer or mid-trial prospect runs it? Currently: tells them they're fine. One-line add, real value, nobody will think of it.

**Blocking action:** verify licenses before any code is lifted. This gates the dependency choice, not just the paperwork.

---

## Testing

**Fixture-based, HAR replay, deterministic.** Record real sites once, replay in CI. Providers get tested against recorded traffic, not the live internet. Otherwise the suite fails when a prospect redeploys.

`cli` should support capture mode — hit a real URL, write the HAR + DOM snapshot to `fixtures/`. That's also the QA corpus tool.

**QA corpus:** 20–30 real sites across Shopify / SFCC / custom / headless, hand-labeled. **Ground truth only exists by doing the real thing** — fresh mailbox, add to cart, abandon, wait 24h. That's the ruler we calibrate against, not the product. It's more hours than anyone estimates and it had no owner as of the session. Ask.

Related: a **browser extension** is the right shape for corpus capture — a labeler browses like a person (real IP, real session, consent clicked, cart populated, no bot detection) and records what the headless crawler _should_ have seen. Diffing that against actual crawler output is how you find out Tier-1 accuracy is a lie before a prospect's CTO does. Separate track, but it's this package's safety net. Note Omnibug is already extension-shaped, so its harness would lift too.

---

## Deployment

**Local:** `cli` + in-process adapter. Playwright drives a real local Chromium. No service needed.

**Cloud — two viable shapes, pick deliberately:**

1. **Lambda + Function URL with response streaming** (`RESPONSE_STREAM` invoke mode) + `@sparticuz/chromium`. Streams SSE natively. Watch: cold starts on a headless Chrome payload, 15-min ceiling, package size limits. _Verify current versions and limits — this is from Jan-2026 knowledge and AWS moves._
2. **ECS Fargate + ALB.** Always-warm, no cold start, no time ceiling, comfortable with long inspections and SSE. Costs money while idle.

Given inspections run 30–60s+ and the UX promise is a live progress stream, Fargate is the lower-risk default and Lambda is the cost optimization. Don't start with the optimization.

Keep `service` thin enough that this choice is reversible.

**Rate limiting and politeness are not optional.** Someone will paste a competitor's URL, Amazon, or BlueConic's own homepage. Decide behavior before launch, not after.

---

## Non-goals

Write these down and defend them:

- No add-to-cart, no checkout, no cart mutation _(observe-only decision)_
- No logged-in state
- No PII collection from the audited site
- No mobile app
- **No scoring copy** — this package emits structured findings. Wording is the rubric owner's, and it's a positioning decision dressed as an engineering one.
- **No simulation** — that's the frontend/sim track. This package feeds it.

---

## Open questions — need answers, don't guess

- [ ] **Does the client know their affirmed signal list is half-unobservable under their own observe-only decision?** Signals 4–6 (and the ordering half of 2, the step-walk of 5) can't be delivered as gap findings — only as "needs deeper audit." If they're expecting six green/red tiles, that's a mismatch to surface _now_, framed as: the unobservable ones become the demo CTA.

- [ ] **Licenses** for Omnibug and Blacklight Collector. Blocking.
- [ ] **Rubric owner** — named? The quality-axis gap needs them.
- [ ] **QA corpus owner** — named? This is the accuracy story.
- [ ] **Confirmed internal launch date** — late October is inferred from the BFCM runway, not confirmed.
- [ ] **Event schema sign-off** from the frontend dev. Cheap now, expensive in September.
- [x] ~~**Consent handling.**~~ **Resolved 2026-07-15: always accept all.** See "The constraint that defines the design." Remaining sub-question: does geo still matter? Banners appear (or don't) based on crawl IP — a US IP may never see the banner an EU shopper sees, so simulated-location support (Blacklight offers Ohio / California / Europe) is still an open October question even with accept-all decided.
- [ ] **Commercial tag-auditing tools** (ObservePoint et al.) — never searched. Real build-vs-buy question that nobody has run down.
- [ ] Geo: crawling from a US IP? Some prospects geo-gate.

---

## Suggested skills

- **`skill-creator`** — worth building an "add a new provider" skill once the first two or three ESP decoders exist. The pattern will be repetitive (identify vendor request shape → write matcher → record fixture → assert tier), it'll be repeated ~a dozen times, and the tiering logic is subtle enough that a codified skill beats re-deriving it. This is the highest-value skill investment on this project.
- Check for project-local or plugin skills in the repo before starting; this handoff was written outside that environment and can't see them.
- The document skills (`docx`, `pptx`, `xlsx`, `pdf`) are irrelevant here. Deliverables are code and markdown.

---

## First moves (next 24h)

1. **Write `types.ts` and hand it to the frontend dev.** First thirty minutes, before anything else. Another person is blocked on it.
2. Scaffold `core` + `runner` + `cli` with one stub provider. Prove the event stream end-to-end on a real URL locally.
3. Thin SSE wrapper so the FE has a real endpoint.
4. **`present`-tier breadth in one pass** — port the arrays from `bc-console-probe.js`. ~30 vendors, one table.
5. **`wired` tier for Klaviyo + Meta only**, beacon shapes verified by hand against the hero site.
6. Everything else stays `evidence_of_use: 'unobservable'`. That's honest, not a gap.

## After the prototype (the real build)

7. **Verify licenses.** Gates whether the October breadth push lifts Omnibug or hand-rolls ~70 decoders. Do this before anyone starts the breadth push, not during.
8. Fixtures + HAR replay before provider count grows past ~5. Retrofitting fixtures onto twenty providers is miserable.
9. Blacklight-style attribution layer, unlocking the `confirmed` tier.
10. Platform fingerprinting branch (Shopify's server-side `Started Checkout` problem).

## Note on how to work this

The human owns this package and has deep ecommerce UX/frontend background — 7 years at a $500MM ecommerce company. They check claims rather than accepting them; an earlier session asserted a category-wide negative about published event decoders and was wrong (Omnibug had been doing it for years). **Mark what's verified vs. remembered. Assert less. Say "I haven't checked" out loud.**
