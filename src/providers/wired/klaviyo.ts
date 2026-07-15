import type { ObservedRequest, Signal, WiredMatcher } from '../../types';

/**
 * Klaviyo `wired` tier: a track/identify beacon fired, proving the ESP is doing something rather
 * than merely being installed. This is the payload of the whole cart-recovery demo, the thing
 * that separates a live abandoned-cart flow from klaviyo.js sitting on every Shopify store.
 *
 * DELIBERATELY INERT until the step-0 probe lands, same as the Meta matcher. Registering it makes
 * Klaviyo read "installed, no evidence of cart events firing"; the beacon predicate waits for a
 * verified fixture so we never guess a shape. Fill `matchesBeacon`, add a fixture-backed test,
 * and the present/wired distinction goes live.
 */
export const klaviyoWiredMatcher: WiredMatcher = {
	id: 'cart.esp.klaviyo',
	matchRequest(req: ObservedRequest): Signal | null {
		if (!matchesBeacon(req))
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
		};
	},
};

/** Placeholder. Returns false until a probe-verified beacon shape is dropped in. */
function matchesBeacon(_req: ObservedRequest): boolean {
	// TODO(step-0): assert against the real onsite track/identify shape from fixtures/probe-<site>.json.
	return false;
}
