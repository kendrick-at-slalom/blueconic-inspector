import type { ObservedRequest } from '../../src/types';
import { describe, expect, it } from 'vitest';
import { matchRequest } from '../../src/core/matching';
import { defaultRegistry } from '../../src/providers';

const wiredIds = new Set(defaultRegistry.wiredMatchers.map(m => m.id));

function req(url: string): ObservedRequest {
	return { url, method: 'GET', resourceType: 'script', ts: 0 };
}

describe('present-tier matching', () => {
	// One representative script URL per category, plus the expected id.
	const cases: Array<[string, string]> = [
		['https://static.klaviyo.com/onsite/js/klaviyo.js', 'cart.esp.klaviyo'],
		['https://cdn.attn.tv/loader.js', 'cart.sms.attentive'],
		['https://cdn.justuno.com/vendor/1234.js', 'cart.exit_intent.justuno'],
		['https://connect.facebook.net/en_US/fbevents.js', 'ads.pixel.meta'],
		[
			'https://cdn.dynamicyield.com/api/123/api_dynamic.js',
			'recs.recs.dynamic_yield',
		],
		['https://cdn.shopify.com/s/files/1/theme.js', 'platform.shopify'],
		['https://x.blueconic.net/tags.js', 'identity.blueconic'],
		['https://static.rechargecdn.com/assets/loader.js', 'loyalty.recharge'],
		[
			'https://cdn.cookielaw.org/consent/abc-123/otSDKStub.js',
			'consent.onetrust',
		],
	];

	it.each(cases)('matches %s to %s at present tier', (url, expectedId) => {
		const signals = matchRequest(req(url), defaultRegistry, wiredIds);
		const hit = signals.find(s => s.id === expectedId);
		expect(hit).toBeDefined();
		expect(hit?.mechanism_present).toBe(true);
		expect(hit?.observability).toBe('observable');
	});

	it('reports "none" for a watched vendor (a wired matcher is registered) and "unobservable" otherwise', () => {
		const klaviyo = matchRequest(
			req('https://static.klaviyo.com/x.js'),
			defaultRegistry,
			wiredIds,
		).find(s => s.id === 'cart.esp.klaviyo');
		const attentive = matchRequest(
			req('https://cdn.attn.tv/x.js'),
			defaultRegistry,
			wiredIds,
		).find(s => s.id === 'cart.sms.attentive');
		expect(klaviyo?.evidence_of_use).toBe('none');
		expect(attentive?.evidence_of_use).toBe('unobservable');
	});

	it('returns nothing for an unrelated request', () => {
		expect(
			matchRequest(
				req('https://example.com/theme.css'),
				defaultRegistry,
				wiredIds,
			),
		).toHaveLength(0);
	});
});
