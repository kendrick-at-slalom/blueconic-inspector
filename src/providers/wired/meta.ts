import type { ObservedRequest, Signal, WiredMatcher } from '../../types';

/**
 * Meta pixel `wired` tier: a tracking beacon actually fired, not just the pixel script loading.
 *
 * DELIBERATELY INERT until the step-0 probe lands. Registering this matcher is what makes the
 * present-tier signal read "installed, no evidence it fires" rather than "couldn't verify use" —
 * that copy is the product's core claim. But the beacon-URL predicate stays unwritten on purpose:
 * a `wired` matcher built from a remembered endpoint shape produces confidently false findings,
 * and that is the one thing we agreed never to ship. Fill `matchesBeacon` from a verified probe
 * fixture (fixtures/probe-<site>.json), then this goes live with a real test behind it.
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
