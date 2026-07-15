**Companion to:** `cart-recovery-discovery-session.md` (now historical — session held morning of 2026-07-15) **Status:** Build plan. Simulation confirmed in scope alongside detection. **Clock:** ~24 hours to a prototype. Ship target remains late-October build/QA complete for the BFCM runway.

---

# The One Decision That Matters in 24 Hours

**Do not build the crawl into the prototype.**

The riskiest assumption in this product is not _can we crawl a cart page_. It's **does the side-by-side moment land** — does a prospect seeing their own blanket-discount modal next to what BlueConic would have shown instead actually feel like a gut punch.

That is testable with a screenshot a human took by hand. A person opening Chrome, adding something to a cart, hitting Cmd-Shift-4, and triggering the exit-intent modal by moving the mouse to the top of the window produces a _better_ asset than our crawler will produce in October, in about four minutes, with zero engineering.

Wire the crawl to the sim and you spend the entire budget on Cloudflare and empty-cart 302s and ship nothing anyone can react to. Fake the crawl and you spend the entire budget on the thing that's actually in question.

**Prototype = the money shot, hardcoded, on real sites, with hand-captured inputs.**

If detection is also being prototyped in this window, it's a parallel track with a different person and a different demo. Don't let them block each other.

---

# What 24 Clock Hours Actually Buys

Subtract sleep and family and it's realistically **8–12 working hours**, and the last two go to the thing breaking.

|Hours|What|
|---|---|
|0–1|Pick 3 target sites. At least one obvious blanket-discount offender.|
|1–2|Hand-capture: cart screenshots, their real modal, logo, product shots.|
|2–6|Build the overlay + toggle against site #1. Get it genuinely good.|
|6–8|Template it to sites #2 and #3. This is where you learn if the overlay generalizes.|
|8–10|The BlueConic-side Dialogue copy. Real next-best-action logic, not lorem.|
|10–12|Buffer. It will be used.|

**Cut lines, in order, when it slips:** site #3 → site #2 → the toggle animation → everything except one site, one flow, one perfect side-by-side.

One polished site beats three broken ones. A prototype that shows the moment landing on a single real retailer makes the case. Three half-rendered overlays make the opposite case.

---

# What "simulation" Means Here

Detection tells the prospect _what's wrong_. Simulation shows _what right looks like_ — a BlueConic Dialogue firing on a cart, ideally theirs.

Per the pain points, the strongest version isn't a generic recovery experience. It's **their own 10%-off-to-anonymous-nobody modal, next to a targeted no-discount reminder**. That's margin erosion made visual. It's the whole pitch in one image, and it's the one finding that needs no hedging — we're not claiming anything about what we couldn't see, we're showing them their own modal.

## The Constraint That Shapes Everything

**You cannot run your JavaScript inside someone else's origin from your own page.** Same-origin policy. Every option below is a different dodge around that wall. The ranking is mostly about how expensive the dodge is.

## What a Real Crawl Would Harvest (October, Not tomorrow)

Logo, brand colors, fonts, product imagery, cart screenshot, their exit-intent modal, detected vendor stack. Simulation is a _consumer_ of the Phase 0 fingerprint engine, not a parallel build. For the prototype, a human is the fingerprint engine.

---

# Option A: Static Screenshot + Overlaid Simulation

## Prospect Journey

1. Enters URL, waits, gets audit results.
2. Scrolls to "Here's what we found on your cart page."
3. Sees a **screenshot of their own cart** — their products, their branding.
4. A BlueConic-style Dialogue is composited on top, referencing the actual products in the shot.
5. Toggle: "What you show today" / "What BlueConic would show." Their 10%-off modal flips to a targeted, no-discount reminder.
6. CTA: see this live on your site → demo request.

## Implementation

_Production:_ headless Chrome screenshots the cart page, store the image, render the Dialogue as absolutely-positioned HTML over an `<img>`. _Prototype:_ a human takes the screenshot. Everything downstream is identical.

## Pros

- No same-origin problem — there's no origin, just a JPEG.
- No CSP, no `X-Frame-Options`, no cookie rewriting, no bot detection at display time.
- Legal exposure minimal and well-understood: displaying a screenshot of a public page the visitor themselves requested.
- **Prototype path is the production path minus the crawl.** Nothing gets thrown away.
- Degrades gracefully — screenshot fails, show the finding as text.
- The side-by-side toggle _is_ the margin-protection pitch, and it's two divs.

## Cons

- It's a picture. Doesn't scroll, doesn't respond, nothing clicks.
- Screenshot fidelity is fiddly at scale: lazy-loaded images, sticky headers, consent banners eating the viewport. (Not a prototype problem. Very much an October problem.)
- Positioning the overlay convincingly across arbitrary layouts is real CSS work and per-site guesswork. **Hours 6–8 exist to find out how bad this is.**
- Production version requires a populated cart → drags in interact-vs-observe.
- Someone will ask for it to be interactive within a week of launch.

## Verdict

**Build this.** Highest payload per hour, and the prototype work survives into production.

---

# Option B: Rebuilt Storefront Skin

## Prospect Journey

1. Enters URL, waits.
2. Sees an **interactive cart page that looks like theirs** — their logo, colors, product photos, type.
3. Actually interacts: moves toward the tab close, exit-intent Dialogue fires for real.
4. Clicks through a full recovery flow.
5. CTA.

## Implementation

_Production:_ scrape brand tokens (logo, `og:image`, CSS custom properties or dominant colors, font stack) + product imagery. Render **our own** cart component styled with their tokens. Their code never runs; it's a cover version. _Prototype:_ hand-pick the tokens. Which means you're just… building a cart page.

## Pros

- Fully interactive; every pixel is ours. No rewriting, no proxying, no CSP.
- Roughly the same legal posture as a screenshot.
- Genuinely impressive when the tokens land.
- Robust across their stack — headless, Shopify, custom, all identical to us.
- One layout to maintain instead of infinite per-site overlay positioning. **This is its real long-term argument over A.**

## Cons

- **Uncanny valley.** Close-but-wrong reads worse than an honest screenshot. Bad font match makes it feel like a phishing page.
- Token extraction fails ugliest on the most distinctively-designed sites — which correlate with the best leads.
- "This isn't my site" is a credibility hit on a tool whose entire value is _we looked at your actual site_.
- Trademark use is squishier than a screenshot: not depicting their site, rendering a facsimile.
- **For the prototype specifically:** hand-picked tokens hide the only risk that matters. You'd demo a version whose hard part is stubbed, and learn nothing about whether it works.

## Verdict

**Not in 24 hours.** It's the upgrade path once the QA corpus tells us how often extraction lands. Revisit in August.

---

# Option C: Iframe + Overlay

## Prospect Journey

Same as B, but with the real live site inside the frame.

## Implementation

`<iframe src="theirsite.com/cart">`, overlay our Dialogue on top.

## Pros

- Trivial to build if it works.

## Cons

- **It doesn't work.** Any retailer worth pitching sends `X-Frame-Options: DENY` or `frame-ancestors` CSP.
- Can't touch anything inside the frame anyway — same-origin again. On success it's a screenshot with extra steps and a scrollbar.
- Sites that _do_ allow framing are ones we don't want as leads. Self-selecting for irrelevance.
- Their cart is empty when framed. No session, no cart.

## Verdict

**No.** Documented so nobody re-proposes it.

---

# Option D: Reverse Proxy

## Prospect Journey

1. Enters URL.
2. Sees their **real, live, working site** served through our domain with BlueConic Dialogues injected.
3. Shops, adds to cart, tries to leave, watches recovery fire on their own real product.
4. CTA.

## Implementation

Fetch server-side, rewrite every URL across HTML/CSS/JS, strip CSP, rewrite cookie domains, inject our script, proxy all subsequent requests.

## Pros

- Highest possible fidelity. It's their actual site.
- The personalized-demo vendors do this, so it demonstrably ships.

## Cons

- **Not one hard problem — forty.** URL rewriting through minified bundles. SRI hashes that no longer match. CORS. Service workers. HSTS. Absolute URLs baked into JS. Scripts reading `window.location` and changing behavior. Cookie domain rewriting.
- Datacenter IP hits their bot detection, with the whole site depending on it.
- **Shopify checkout is on a different domain** — the flow we care most about escapes the proxy.
- **Legal.** BlueConic serving a modified copy of a stranger's copyrighted site, with their trademarks, from BlueConic infrastructure, on a public unattended page. Lawyer before engineer.
- Every one of the forty surfaces as a broken page on a prospect's site during a demo.
- Permanent maintenance — their site changes, our proxy breaks.

## Verdict

**No.** Not 24 hours, not 24 weeks without counsel first.

---

# Option E: Browser Extension

## Prospect Journey

No self-serve journey exists. A prospect on BlueConic's homepage will not install an extension to get an audit.

**Rep-driven:**

1. Rep on a call, on the prospect's real site.
2. Adds to cart as a normal human, moves to leave.
3. Prospect's own modal fires — the real one, live.
4. Rep toggles the extension: BlueConic's Dialogue replaces it, in place, on the real site.
5. Conversation.

## Implementation

MV3 content script. Runs _in_ the page, so same-origin isn't a constraint — you are the origin.

## Pros

- **Every crawl wall disappears.** Real Chrome, real human, real IP, real session. Cloudflare/Akamai/DataDome never fire. Consent banners get clicked. Cart gets populated. Geo-gating moot.
- Full DOM access, real events, real cart state, logged-in session if the rep has one.
- **Omnibug is already this shape.** Going extension means its harness lifts too, not just `src/providers` — we'd add ~a dozen ESP providers to a working MV3 request decoder. Cheapest working detector on the board.
- Doubles as the **QA corpus tool**, which the discovery doc needs and has no owner for. Labeler browses like a person; extension records what the headless crawler _should_ have seen. That diff is how we learn Tier-1 accuracy is a lie before a prospect's CTO does.
- **A 24h extension prototype is genuinely feasible** — a content script that overlays a Dialogue on a live site is a few hours, and it demos on the real thing.

## Cons

- **Kills self-serve.** Not the product on the board.
- Chrome Web Store review cycle.
- Requires "read and change all your data on all websites" — flagged critical risk in store listings. Omnibug carries that flag today. Survivable; it's a trust conversation.
- Blacklight becomes the mismatch — its Puppeteer instrumentation needs reimplementing against extension APIs.
- **Prototype trap:** it demos _better_ than what we can actually ship self-serve. Show this to stakeholders and you've set an expectation the October product cannot meet.

## Verdict

**Right build, wrong job, dangerous demo.** Build it for QA and rep demos on its own track. Do not let it be the thing shown as "the prototype" unless everyone in the room knows it isn't the product.

---

# Option F: Generic Demo, No Personalization

## Prospect Journey

1. Enters URL, gets audit results.
2. Sees a polished interactive demo on a **fictional storefront** — "here's what this looks like in practice."
3. CTA.

## Implementation

Build one nice demo. Ship it. Ignore their site for the sim half.

## Pros

- Zero risk, zero per-site failure modes, fully controllable quality.
- Always works.
- Can be genuinely beautiful because we control everything.
- **The honest fallback** when personalization fails.

## Cons

- Disconnected from the audit — the "that's _my_ cart" payload is gone.
- Indistinguishable from every other vendor's demo video.
- Doesn't exploit the crawl, wasting what makes this tool different.

## Verdict

**Not the prototype.** The prototype's entire job is proving personalization lands. But build it before launch as the degradation path.

---

# Comparison

|                         | Fidelity | Interactive | Personalized | Legal risk | Build cost | 24h prototype        |
| ----------------------- | -------- | ----------- | ------------ | ---------- | ---------- | -------------------- |
| A: Screenshot + overlay | Med      | No          | High         | Low        | Low        | ✅ **build this**     |
| B: Rebuilt skin         | Med-High | Yes         | High         | Med        | Med        | ❌ hides its own risk |
| C: Iframe               | —        | —           | —            | —          | —          | ❌                    |
| D: Reverse proxy        | Highest  | Yes         | Highest      | **High**   | Very high  | ❌                    |
| E: Extension            | Highest  | Yes         | Highest      | Low        | Med        | ⚠️ separate track    |
| F: Generic              | Low      | Yes         | None         | None       | Low        | ❌ wrong job          |

---

# Recommendation

**Prototype (next 24h):** Option A. Hand-captured screenshots, 3 real sites, hardcoded, no crawl. One site polished beats three broken.

**Ship (October):** A + crawl, with F as the graceful-degradation path when the screenshot or modal trigger fails.

**Parallel, own timeline:** E, for QA ground truth and rep demos.

**B** is the August upgrade decision, gated on QA corpus data about token extraction.

**D** stays off the board until someone names a job A+E can't do.

---

# Open: Carried from the Session

The session happened this morning. These need answers from it, not speculation:

- [ ] **Interact-vs-observe** — what was decided? The production version of A needs a populated cart. Prototype dodges this; October doesn't.
- [ ] **The language rule** for unverifiable claims — agreed as "we couldn't detect X"?
- [ ] **Rubric owner** — named?
- [ ] **QA corpus owner** — named? This is E's justification.
- [ ] **Confirmed internal launch date.**
- [ ] **Acquisition Pressure Test** relationship — complement, replace, or sit alongside?

# Still-live Issues These Docs Raised

- **The rubric needs a quality axis.** A site with a dumb blanket-discount modal should score _worse_ than a site with nothing — it's training shoppers to abandon on purpose. Confirmed/Wired/Present/Absent is unidimensional and inverts on exactly the cases that make the best demos. **This is also what the prototype demonstrates**, so the two are linked.
- **Triggering their exit-intent modal requires synthesizing `mouseleave`** — interaction, not observation, but no cart mutation. Argues for a third path: observe + minimal synthetic interaction, no cart mutation.
- **Detect BlueConic itself.** Listeners, Dialogues, and Product Recommendations install on customer sites, so BlueConic has a fingerprint. What does the tool do when a customer or mid-trial prospect runs it? Currently: tells them they're fine.
