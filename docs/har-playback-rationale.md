# Active-browse runner mode could change everything

The tool's one magic trick is telling "installed" from "actually working." Klaviyo is installed on basically every Shopify store, so "installed" is worthless — the money is proving it's doing something (firing events = live flows).

The gut-punch we hit: on Shopify, that proof doesn't show up when our robot just loads the page and stares at it. It only shows up when a real human browses. So it looked like the tool could only ever say "installed" on Shopify — most of the market — and the magic trick dies there.

The HAR just told us why: Klaviyo waits until it thinks a human is actually engaged (scrolling, moving the mouse, spending time on a product page) before it fires "Viewed Product." Our robot did none of that. It loaded and froze like a mannequin. No engagement, no event.

Here's the unlock: "browse like a human" is not "shop like a human." Scrolling, wiggling the mouse, and lingering on a product page doesn't add anything to a cart, doesn't check out, doesn't log in — it doesn't touch their store at all. It stays inside our "observe-only, don't mess with anything" rule. We're just a more convincing window-shopper.

So if we teach the robot to window-shop (not buy), Klaviyo probably fires "Viewed Product," and the tool proves "actually working, live, right now" on Shopify — the thing we thought was off the table. The demo difference is enormous: "paste your URL and watch us prove your Klaviyo is live" beats "let us replay a recording." It flips the core claim from working on the non-Shopify minority to ~every prospect.

The catch, honestly: it's a bet. Klaviyo might sniff that the browser is a robot (headless leaves fingerprints) and refuse to fire even with fake browsing. That's why it's a spike — a quick experiment, not a commitment. Works → huge. Doesn't → we fall back to the replay runner (building it anyway), nothing lost.

On the HAR-replay runner "(i think)": keep it regardless. It's the fallback demo vehicle and the deterministic test fixture the plan wanted (replay a real session, assert wired, no live-internet flakiness). Two jobs, one small piece.
