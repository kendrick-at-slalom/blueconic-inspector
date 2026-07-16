import type { ObservedRequest, Signal, WiredMatcher } from '../../types';

const BEACONS = ['attentivemobile.com/1/subscribers', 'attn.tv/track'];

/**
 * Attentive `wired` tier: the SMS program is actively capturing or tracking, not just loaded. Verified
 * against a real Magic Spoon session (2026-07-15): `POST api.attentivemobile.com/1/subscribers` is the
 * SMS opt-in (identity captured), and `<shop>.attn.tv/track` is behavioral tracking. This is the
 * multi-channel proof for Cart Recovery alongside Klaviyo. Interaction-gated like Klaviyo (the
 * subscribe needs a form submit), so live reachability carries the same observe-only caveat.
 */
export const attentiveWiredMatcher: WiredMatcher = {
	id: 'cart.sms.attentive',
	matchRequest(req: ObservedRequest): Signal | null {
		const url = req.url.toLowerCase();
		const hit = BEACONS.find(beacon => url.includes(beacon));
		if (hit === undefined)
			return null;
		return {
			id: 'cart.sms.attentive',
			vendor: 'attentive',
			category: 'sms',
			play: ['cart_recovery', 'churn_winback'],
			mechanism_present: true,
			evidence_of_use: 'wired',
			observability: 'observable',
			method: 'network',
			confidence: 0.9,
			evidence: [{ kind: 'request', detail: req.url, timestamp: req.ts }],
			evidence_total: 1,
			notes: hit.endsWith('subscribers') ? 'SMS subscriber captured (identity).' : 'Behavioral tracking active.',
		};
	},
};
