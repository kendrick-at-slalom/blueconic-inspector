import type { ObservedRequest } from '../../src/types';
import { describe, expect, it } from 'vitest';
import { klaviyoWiredMatcher } from '../../src/providers/wired/klaviyo';
import { metaWiredMatcher } from '../../src/providers/wired/meta';

// POST fetch is the real shape of these beacons; method doesn't gate the matcher, but keep it honest.
function req(url: string): ObservedRequest {
	return { url, method: 'POST', resourceType: 'fetch', ts: 0 };
}

describe('klaviyo wired matcher (verified against a Magic Spoon session 2026-07-15)', () => {
	it('wires on client/events (a behavioral event fired)', () => {
		const signal = klaviyoWiredMatcher.matchRequest(req('https://a.klaviyo.com/client/events/?company_id=HMWFR8'));
		expect(signal?.evidence_of_use).toBe('wired');
		expect(signal?.id).toBe('cart.esp.klaviyo');
	});

	it('wires on client/profiles (identity captured)', () => {
		const signal = klaviyoWiredMatcher.matchRequest(req('https://a.klaviyo.com/client/profiles/?company_id=HMWFR8'));
		expect(signal?.evidence_of_use).toBe('wired');
		expect(signal?.notes).toMatch(/identity/i);
	});

	// The whole point of the present/wired split: client/sessions is presence in disguise.
	it('does NOT wire on client/sessions (onsite-tracking init, fires on nearly every store)', () => {
		expect(klaviyoWiredMatcher.matchRequest(req('https://a.klaviyo.com/client/sessions/?company_id=HMWFR8'))).toBeNull();
	});

	it('does NOT wire on the onsite script load', () => {
		expect(klaviyoWiredMatcher.matchRequest(req('https://static.klaviyo.com/onsite/js/klaviyo.js?company_id=HMWFR8'))).toBeNull();
	});
});

describe('meta wired matcher (intentionally inert: Shopify CAPI, no client-side /tr to verify)', () => {
	it('stays inert even on a plausible /tr URL, because we have no verified client-side shape', () => {
		expect(metaWiredMatcher.matchRequest(req('https://www.facebook.com/tr?id=100589946948288&ev=PageView'))).toBeNull();
	});
});
