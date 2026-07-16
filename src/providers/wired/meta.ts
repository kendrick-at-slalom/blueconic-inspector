import type { ObservedRequest, Signal, WiredMatcher } from '../../types';

/**
 * Meta pixel `wired` tier: a tracking beacon actually fired, not just the pixel script loading.
 *
 * SUPERSEDES the earlier "server-side CAPI, inert" conclusion (see decisionLog top entry,
 * 2026-07-15). That call was drawn from headless beacon-capture crawls, which never engaged the
 * page. The handed-over consented Magic Spoon session tells a different story: 18 `POST
 * facebook.com/tr/` beacons (pixel `id=2116162018694323`, `ev=PageView|ViewContent|Lead|
 * SMSSignup`), every one carrying `a=shopify_web_pixel`. Meta runs inside the Shopify Web Pixel
 * sandbox — first-party, server-relayed — which is why there's no literal `fbevents.js` request
 * even though `/tr` fires all session. So the beacon is real and client-side; it just isn't the
 * bare `connect.facebook.net` shape this file used to wait on.
 *
 * Stays at `wired`, not `confirmed`, despite the hashed `ud[external_id]` (advanced matching) in
 * the payload — `confirmed` needs an attribution layer that's out of scope for the prototype.
 */
const BEACON_PATH = 'facebook.com/tr';

export const metaWiredMatcher: WiredMatcher = {
	id: 'ads.pixel.meta',
	matchRequest(req: ObservedRequest): Signal | null {
		if (!req.url.toLowerCase().includes(BEACON_PATH))
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
			evidence: [{ kind: 'request', detail: describeBeacon(req), timestamp: req.ts }],
			evidence_total: 1,
			notes: 'Live via Shopify\'s Web Pixel sandbox (server-relayed); no fbevents.js on the page.',
		};
	},
};

/** Pulls `ev`/`id` out of the urlencoded POST body when present, for a re-verifiable evidence detail. */
function describeBeacon(req: ObservedRequest): string {
	if (!req.postData)
		return req.url;
	const params = new URLSearchParams(req.postData);
	const ev = params.get('ev');
	const id = params.get('id');
	const parts = [ev ? `ev=${ev}` : null, id ? `id=${id}` : null].filter((p): p is string => p !== null);
	return parts.length > 0 ? `${req.url} (${parts.join(', ')})` : req.url;
}
