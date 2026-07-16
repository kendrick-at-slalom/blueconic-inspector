import type { ObservedRequest, Signal, WiredMatcher } from '../../types';

/**
 * Meta pixel `wired` tier: a tracking beacon actually fired, not just the pixel script loading.
 *
 * DELIBERATELY INERT, and now for a verified reason. Registering this matcher is what makes the
 * present-tier signal read "installed, no evidence it fires" rather than "couldn't verify use" —
 * that copy is the product's core claim. The beacon-URL predicate stays unwritten because on
 * Shopify+Meta the `/tr` beacon fires server-side (Conversions API), not client-side: a real Magic
 * Spoon session (2026-07-15) with consent accepted and a full cart/form interaction produced zero
 * `facebook.com/tr` requests, only `fbevents.js` + `signals/config/<pixelID>`. So there is no
 * client-side shape to verify on this stack. To wire Meta we need a site that fires `/tr` in the
 * browser (many non-Shopify pixels still do), captured the same verified-not-remembered way. See
 * decisionLog; a guessed shape stays the one thing we never ship.
 */
export const metaWiredMatcher: WiredMatcher = {
	id: 'ads.pixel.meta',
	matchRequest(req: ObservedRequest): Signal | null {
		if (!matchesBeacon(req))
			return null;
		return {
			id: 'ads.pixel.meta',
			vendor: 'meta',
			category: 'ad_pixel',
			play: ['retargeting_suppression'],
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
	// TODO(step-0): assert against the real /tr beacon shape from fixtures/probe-<site>.json.
	return false;
}
