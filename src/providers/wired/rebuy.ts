import type { ObservedRequest, Signal, WiredMatcher } from '../../types';

/**
 * Rebuy `wired` tier: the recommendation engine is actively serving and tracking widgets, not just
 * installed. Verified against a real Magic Spoon session (2026-07-15): `POST rebuyengine.com/api/v2/
 * analytics/event/bulk` fires as the Smart Cart / recommended / gift-with-purchase widgets render.
 * This is the wired signal for Order Value Expansion (the CEO's flagged play). Unlike Klaviyo's
 * events, Rebuy's analytics likely fires on widget render, so it may be reachable on a bare crawl
 * (untested; the spoof/active-browse work will settle it).
 */
export const rebuyWiredMatcher: WiredMatcher = {
	id: 'recs.recs.rebuy',
	matchRequest(req: ObservedRequest): Signal | null {
		if (!req.url.toLowerCase().includes('rebuyengine.com/api/v2/analytics/event'))
			return null;
		return {
			id: 'recs.recs.rebuy',
			vendor: 'rebuy',
			category: 'recs',
			play: ['order_value_expansion'],
			mechanism_present: true,
			evidence_of_use: 'wired',
			observability: 'observable',
			method: 'network',
			confidence: 0.9,
			evidence: [{ kind: 'request', detail: req.url, timestamp: req.ts }],
			evidence_total: 1,
			notes: 'Recommendation widgets actively firing analytics events.',
		};
	},
};
