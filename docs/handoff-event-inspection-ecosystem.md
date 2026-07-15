**Written:** 2026-07-15
**Next session focus:** Prior-art / build-vs-buy for the Phase 0 fingerprint engine and the Cart Recovery detector.
**Status:** Research pass only. Nothing installed, nothing prototyped, no licenses verified.

---

# Where This Sits

Project context and Phase 1 scope live in the project's custom instructions (BlueConic prototype project: shared context). Don't restate them; read them.

Session artifact: `/mnt/user-data/outputs/cart-recovery-discovery-session.md` — question bank for a 2-hour Cart Recovery discovery session. This handoff is the research that came out of it and is not yet folded in.

**Pending work item the human asked about and hasn't received:** a "prior art / build-vs-buy" section to be added to that doc, placed _before_ section 3 (Crawl reality), because the interact-vs-observe decision determines which of these tools is even relevant.

---

# The Question

Is there an existing JS/TS event inspector we can leverage, rather than building tag/event detection from scratch?

Short answer: **the mechanical layer is largely solved and open source. The ecommerce-lifecycle semantic layer is not.** The gap splits cleanly along our Phase 1 tiers, which is the most decision-relevant finding here.

---

# Findings

## Blacklight Collector — Closest Fit for the Instrumentation Layer

- `@themarkup/blacklight-collector` on npm; repo `the-markup/blacklight-collector`. TypeScript, Puppeteer-based (^22.x), ~230 stars, dependencies actively bumped.
- Engine behind The Markup's public Blacklight tool (https://themarkup.org/blacklight).
- Does **runtime API instrumentation**, not regex-on-HTML. Borrows FourthParty's method for monitoring what user data is sent to third parties; detects session replay and keylogging (text captured before submit). `stacktrace-js` is a dependency → calls are attributable to the originating script.
- Outputs: raw recorded events, cookie JSON, optional HAR.
- Credits OpenWPM and the EU-EDPS website evidence collector as antecedents — both worth a look if we go deeper.

**Why it matters for us:** script attribution is the mechanism that distinguishes "vendor script loaded" from "vendor script actually fired an event." That's the Tier Present vs. Tier Wired discriminator in the rubric sketch (see Rubric section below).

**Its documented limits map onto our open questions:**

- Scans initial page load only — no login, no multi-page flow navigation.
- Doesn't detect server-side tracking with no client-side fingerprint. → relevant to the Shopify server-side-events problem.
- Doesn't click consent banners; CMPs load different trackers by simulated location (it offers Ohio / California / Europe). → our GDPR under-detection problem.

Read their methodology page before building anything. It's a free list of walls someone already hit.

**Its report layer is the wrong lens** — privacy ("is this site creepy") vs. ours ("is this site competent"). Take the collector, discard the reports.

## Omnibug — the Provider Dictionary Layer

- Repo `MisterPhilip/omnibug`, site https://omnibug.io. Open source. Browser extension (MV3), Chrome + Firefox.
- Decodes outgoing marketing requests into labeled parameters; classifies hits as page view vs. click event.
- `src/providers` = a per-vendor decoder library. **This is the liftable asset.**
- Supported tags list (verified 2026-07-15): https://omnibug.io/help/supported-tags/ — ~70 vendors.

**What it covers:** Facebook/Meta Pixel, TikTok, Snapchat, Reddit Pixel, Pinterest Conversion, Criteo OneTag, The Trade Desk, Amazon Ad Tag, RTB House, Bing Ads, Google Ads, DoubleClick, GA4, Universal Analytics, GTM, Adobe stack, Tealium, Segment, RudderStack, mParticle, Braze, Brevo, Dynamic Yield, Lytics, session-replay tools.

**What it does NOT cover:** Klaviyo, Attentive, Postscript, Listrak, Bluecore, Justuno, OptiMonk, Wunderkind, Privy.

**Caveats:**

- It's an extension hooking browser request APIs, not an npm library. Providers are liftable; the harness is not.
- It's a _request_ decoder. It reads the resulting network hit, not the originating JS call (e.g. reads the GA4 hit, not the `dataLayer.push`). Usually equivalent information, different observation point. Matters where a call fires but no request results.
- **License unverified. Check before lifting anything.**

## The Tier Split — Most Important Finding

Omnibug's coverage vs. gap is not random. It maps onto Phase 1:

| Play                      | Signal set                                                                          | Prior art                                      |
| ------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------- |
| Retargeting Suppression   | Meta, TikTok, Google Ads, Criteo, Trade Desk, Reddit, Pinterest, Snap, Bing, Amazon | **Substantially covered** by Omnibug providers |
| Cart Recovery (back half) | Klaviyo, Attentive, Postscript, Listrak, Bluecore + exit-intent vendors             | **Nothing published. This is the build.**      |

**Schedule implication worth raising:** the discovery doc already says Retargeting Suppression "can swap to slot 2 without harm" if pixel detection lands early. This finding strengthens that materially — its detector may be largely assembly rather than construction. Real schedule lever; put it on the table.

**Estimate implication:** the net-new dictionary is ~a dozen ecommerce-lifecycle vendors, not seventy marketing tools. Reframes the ask from "build a crawler + event system" to "build an ESP/exit-intent event dictionary on top of a crawler someone else already debugged."

## Wappalyzer Forks — Platform Fingerprinting Only

- Client went closed-source 2023; fingerprint DB stayed open and community-maintained.
- Live forks: `tunetheweb/wappalyzer` (reported most active), `dochne/wappalyzer` (last pre-private commit), `enthec/webappanalyzer`, `Lissy93/wapalyzer`. Python option: Wappalyzer-Next (s0md3v), Playwright-driven, GPL-3.0.
- **Fingerprint count is disputed across sources** — one claims 251 in the current bundled ruleset, another claims 3,000+ signatures. Do not quote a number to BlueConic without verifying.
- Source hygiene: the dev.to migration guide surfaced in search is vendor content promoting a paid Apify actor. Discount accordingly.

**What it is:** a Tier-"Present" machine by construction. Tells you Klaviyo is installed. That is precisely the signal we've decided _does not_ count as capability. Useful for the platform branch (Shopify vs. SFCC vs. custom), useless for capability grading. Don't let anyone conflate the two.

## Pixel/domain Classification

- DuckDuckGo **Tracker Radar** — domain classification. Blacklight integrated an enhanced version (March 2024).
- **EasyList** — added to Blacklight in March 2023 for checking third-party requests.
- Both free and maintained. Cheap Phase 0 input; we'd otherwise hand-roll this badly.

## Runner Choice — Open Fork in the Road

Blacklight is on Puppeteer. Playwright is arguably the better call now for CDP access, request interception, and multi-context concurrency. If we lift Blacklight's _approach_ rather than its _package_, this decision reopens. Don't let it get decided by default.

---

# The Rubric Sketch (from Conversation, Not yet in Any doc)

Prompted by: how do we distinguish "tag present" from "capability present"?

Core asymmetry: **you cannot confirm capability from outside without transacting, but you can disprove it cheaply and definitively.**

- No email captured anywhere before payment → abandoned-cart email is impossible regardless of installed ESP. Flat claim, no hedge needed.
- Cart bound only to anonymous cookie → cross-device recovery impossible.
- Precondition failures are provable. Capability successes are not.

Proposed tiers:

| Tier      | Observation                                                                | Counts as capability? |
| --------- | -------------------------------------------------------------------------- | --------------------- |
| Confirmed | Trigger event fires _with_ identified profile attached                     | Yes                   |
| Wired     | Trigger fires but no identity binding, OR identity captured but no trigger | Partial               |
| Present   | Vendor script loads, nothing else observed                                 | **No**                |
| Absent    | No vendor                                                                  | No                    |

The Klaviyo-on-every-Shopify-store problem is exactly Tier "Present." If that scores as capability, the tool is broken.

**Shopify caveat:** the native Klaviyo integration emits `Started Checkout` server-side, so client-side event presence is less discriminating there. Shopify likely needs its own rubric branch — another argument for platform fingerprinting as a first-class path, not a fallback.

**Ground truth only exists in QA.** Hand-labeled corpus requires someone doing the real thing: fresh mailbox, add to cart, abandon, wait 24h. That's the ruler, not the product. More hours than anyone will estimate.

**Schema consequence:** if a signal can't carry `{mechanism_present, evidence_of_use, method, confidence}` as separate fields, the copy cannot hedge correctly no matter what language rule gets agreed. This is the same question as "absent vs. unobserved" in the discovery doc's failure-modes section, and it probably belongs in the crawl-architecture discussion instead.

---

# Product-shape Note

Blacklight _is_ the shape we're proposing: URL in, 30–60 seconds, findings out. That's close to the existing Acquisition Pressure Test's 90-second promise — evidence the envelope is achievable **at initial-page-load depth**.

It's also evidence for the pessimistic read: they hit that time by _not_ navigating flows. Add a checkout crawl and we leave the envelope. Useful ammunition for the async-plus-email question in the discovery doc.

---

# Unverified / Open

Flagged honestly — the assistant in this session asserted a category-wide negative ("nobody has published a library that knows these event shapes") without searching, and was wrong on the ad-pixel half. Omnibug had been doing it for years. Treat remaining unsearched claims below with the same suspicion.

- [ ] **Licenses.** Blacklight Collector and Omnibug both unverified. The Markup is a nonprofit; this would power a commercial lead-gen tool on a vendor homepage. Real gate, not a formality.
- [ ] **Commercial tag-auditing category — not searched at all.** ObservePoint and similar do enterprise tag auditing at scale. Genuine build-vs-buy question. Also unchecked: DataSlayer, Trackingplan, Analytics Debugger, WASP.
- [ ] Whether any ESP-specific open-source decoder exists that a better search would surface. Absence of evidence here is currently just absence of searching.
- [ ] Fingerprint counts for Wappalyzer forks — sources conflict.
- [ ] Whether Blacklight's `numPages` sampling can be coerced into a purposeful cart/PDP crawl or whether it's random link sampling.
- [ ] Bot-detection posture of all of the above. None of these were built to get past Cloudflare / Akamai / PerimeterX / DataDome.

---

# Suggested Skills

- **`humanizer`** — if any of this becomes prospect-facing or stakeholder-deck copy. The plain-language descriptions in the project context set the register to match.
- **`docx`** — only if a stakeholder deliverable is requested. Default to markdown; the team is working in `.md`.
- **`frontend-design`** — when the audit output UI gets prototyped.
- No skill covers plain markdown authoring; just write the file.

---

# Suggested First Moves for Next Session

1. Write the prior-art / build-vs-buy section into `cart-recovery-discovery-session.md` before section 3. This is owed and not done.
2. Run down the license question on both packages. It gates everything else.
3. Search the commercial tag-auditing category properly.
4. Raise the Retargeting-Suppression-may-be-nearly-free finding as a sequencing lever — it's the highest-value thing in this research.

# Tone Note for Whoever Picks This up

The human has deep ecommerce UX/FE background and checks claims. They caught the overclaim above by asking "really? really-really?" rather than accepting it. Assert less, verify more, and mark what's verified vs. remembered.
