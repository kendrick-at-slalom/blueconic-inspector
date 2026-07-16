import type { ObservedRequest, Signal, WiredMatcher } from '../../types';

/**
 * Klaviyo `wired` tier: a track or identify beacon fired, proving the ESP is doing something
 * rather than merely being installed — the thing that separates a live flow from klaviyo.js
 * sitting on every Shopify store.
 *
 * Verified against a real Magic Spoon session (2026-07-15, company_id HMWFR8):
 *   a.klaviyo.com/client/events   → a behavioral event fired (Viewed Product / Added to Cart)
 *   a.klaviyo.com/client/profiles → identity captured (email/phone bound to a profile)
 * Deliberately NOT `client/sessions`: that fires on plain page load for nearly every Klaviyo
 * store, so it's presence in disguise, not proof of a flow.
 *
 * Observe-only caveat: these fired because a real shopper interacted (viewed, carted, submitted a
 * form). Our headless observe-only crawler doesn't interact, so a live crawl won't TRIGGER them —
 * the matcher recognizes them if they appear (a HAR replay of a real session, or a future
 * interactive crawl mode), but present-vs-wired won't light up from a bare crawl of a Shopify
 * store. That's a rubric consideration, not a matcher bug. See decisionLog.
 */
const BEACON_PATHS = ['klaviyo.com/client/events', 'klaviyo.com/client/profiles'];

export const klaviyoWiredMatcher: WiredMatcher = {
	id: 'cart.esp.klaviyo',
	matchRequest(req: ObservedRequest): Signal | null {
		const url = req.url.toLowerCase();
		const hit = BEACON_PATHS.find(path => url.includes(path));
		if (hit === undefined)
			return null;
		return {
			id: 'cart.esp.klaviyo',
			vendor: 'klaviyo',
			category: 'esp',
			play: ['cart_recovery', 'churn_winback'],
			mechanism_present: true,
			evidence_of_use: 'wired',
			observability: 'observable',
			method: 'network',
			confidence: 0.9,
			evidence: [{ kind: 'request', detail: req.url, timestamp: req.ts }],
			evidence_total: 1,
			notes: hit.endsWith('profiles') ? 'Identity captured (profile beacon).' : 'Behavioral event fired.',
		};
	},
};
