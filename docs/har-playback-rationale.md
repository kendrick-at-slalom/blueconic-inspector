# Active-browse runner mode could change everything

The tool's one magic trick is telling "installed" from "actually working." Klaviyo is installed on basically every Shopify store, so "installed" is worthless — the money is proving it's doing something (firing events = live flows).

The gut-punch we hit: on Shopify, that proof doesn't show up when our robot just loads the page and stares at it. It only shows up when a real human browses. So it looked like the tool could only ever say "installed" on Shopify — most of the market — and the magic trick dies there.

The HAR just told us why: Klaviyo waits until it thinks a human is actually engaged (scrolling, moving the mouse, spending time on a product page) before it fires "Viewed Product." Our robot did none of that. It loaded and froze like a mannequin. No engagement, no event.

Here's the unlock: "browse like a human" is not "shop like a human." Scrolling, wiggling the mouse, and lingering on a product page doesn't add anything to a cart, doesn't check out, doesn't log in — it doesn't touch their store at all. It stays inside our "observe-only, don't mess with anything" rule. We're just a more convincing window-shopper.

So if we teach the robot to window-shop (not buy), Klaviyo probably fires "Viewed Product," and the tool proves "actually working, live, right now" on Shopify — the thing we thought was off the table. The demo difference is enormous: "paste your URL and watch us prove your Klaviyo is live" beats "let us replay a recording." It flips the core claim from working on the non-Shopify minority to ~every prospect.

The catch, honestly: it's a bet. Klaviyo might sniff that the browser is a robot (headless leaves fingerprints) and refuse to fire even with fake browsing. That's why it's a spike — a quick experiment, not a commitment. Works → huge. Doesn't → we fall back to the replay runner (building it anyway), nothing lost.

On the HAR-replay runner "(i think)": keep it regardless. It's the fallback demo vehicle and the deterministic test fixture the plan wanted (replay a real session, assert wired, no live-internet flakiness). Two jobs, one small piece.

## How It Shipped: The Opt-In Gate

Both runners exist now, and the evasion posture is enforced in code rather than promised in a comment.

The `activeBrowse` flag is off by default, and only the literal `true` turns it on. `resolveEvasionMode` is the one gate: hand it anything else (`undefined`, `1`, `"yes"`, a stray object) and it returns `{ stealth: false, activeBrowse: false }`. The runner reads only that resolved mode, so a plain crawl can't spoof by accident, and `launchStealth` throws if it's ever called without an authorized mode. Stealth and active-browse are coupled on purpose. Stealth with nobody browsing won't trip an interaction-gated beacon, and browsing without stealth still reads as a robot to bot-detection, so one authorization flips both on—or nothing runs.

Active-browse stays observe-only. It scrolls, drifts the mouse around, and lingers; it never clicks, fills a form, submits, or follows a link. Browsing like a human isn't shopping like one, so there's no cart, no checkout, and no login. It stays inside the crawler's no-mutation rule while looking engaged enough for Klaviyo to fire "Viewed Product," and a test pins that down: the browse loop is only ever allowed to move, scroll, and dwell.

Stealth itself is a dependency, not something hand-rolled: `playwright-extra` and `puppeteer-extra-plugin-stealth`, both MIT, applied only behind the gate. That's the same call the autoconsent work made. Lean on a maintained library for the fiddly, adversarial part instead of chasing headless fingerprints by hand and re-chasing them every time Chromium shifts.

For a demo, the operator turns it on per run with `--active-browse`, and the CLI prints a banner so it's obvious evasion is live. The productized version is October, not tomorrow: a client-facing checkbox, plus a "you got bot-blocked, tick the box to reach live wired" nudge when a plain crawl hits a 403.
