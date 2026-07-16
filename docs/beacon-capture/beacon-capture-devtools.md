# DevTools Beacon Capture

Purpose: capture the real `wired`-tier beacon shapes for Klaviyo and Meta from a live, consented, interacting session — the things a headless observe-only crawl can't produce. The output verifies the beacon predicates for the two prototype `wired` matchers so present-vs-wired stops being inert.

Why a real browser instead of the crawler: on Shopify+Klaviyo/Meta the discriminating beacons (Klaviyo `client/event` / `client/identify`, Meta `/tr`) never fired in four headless crawls — only Klaviyo's weak `client/sessions` init. They're likely gated behind consent or interaction, or they're server-side. A real session settles which. See the beacon-capture entry in `_working-memory/decisionLog.md`.

## Steps (~5 min, one site)

Use `magicspoon.com` — it's the demo site, the one Shopify PDP in the batch where all five Phase 1 plays light up (Klaviyo + Attentive, Rebuy, Recharge + Yotpo, 11 ad pixels, no CDP), and we already have baseline crawl data on its PDP.

1. Fresh **incognito** window. Open **DevTools → Network** tab, check **Preserve log**.
2. Go to the site. **Accept the cookie banner** if one appears.
3. **View a product**, **add it to cart**, then **submit an email** in a footer or popup signup (a throwaway address is fine).
4. Paste the snippet below into the **Console** and run it. It copies the matching beacon URLs to your clipboard.
5. Paste the result back. **Redact anything personal** (your email, profile IDs) — the path and param _names_ are what matter, not the values.

If the console list looks thin, the Network tab is ground truth: filter by `klaviyo` and by `tr`, and grab any `client/event`, `client/identify`, or `facebook.com/tr?...ev=` rows by hand (those carry the method and payload the console list doesn't).

## The snippet

```js
const urls = [
	...new Set(performance.getEntriesByType('resource').map(e => e.name)),
];
const beacons = urls.filter(u =>
	/klaviyo\.com\/client\/|facebook\.com\/tr/i.test(u),
);
console.log(`BEACONS (${beacons.length}):\n${beacons.join('\n')}`);
copy(beacons.join('\n'));
```

## What happens next

- A Klaviyo `client/event` or `client/identify` URL wires the Klaviyo matcher to the _discriminating_ signal (a live flow), not the weak `client/sessions` init.
- A `facebook.com/tr?id=…&ev=…` URL wires the Meta matcher to the real param shape.
- If `/tr` and the Klaviyo events still don't show even after consent and a populated cart, that's the answer that they're server-side on this stack, and present-vs-wired leans on the Shopify rubric branch rather than a faked matcher.

This is a focused subset of the fuller `bc-console-probe.js` the handoff describes (which also captures globals and event listeners). Enough to fill the two prototype matchers; the fuller probe is an October item.
