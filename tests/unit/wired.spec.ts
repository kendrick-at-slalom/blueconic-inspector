import type { ObservedRequest } from '../../src/types';
import { describe, expect, it } from 'vitest';
import { attentiveWiredMatcher } from '../../src/providers/wired/attentive';
import { klaviyoWiredMatcher } from '../../src/providers/wired/klaviyo';
import { metaWiredMatcher } from '../../src/providers/wired/meta';
import { rebuyWiredMatcher } from '../../src/providers/wired/rebuy';

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

describe('rebuy wired matcher (Order Value Expansion; verified on Magic Spoon)', () => {
	it('wires on the analytics/event beacon (widgets actively firing)', () => {
		const signal = rebuyWiredMatcher.matchRequest(req('https://rebuyengine.com/api/v2/analytics/event/bulk'));
		expect(signal?.evidence_of_use).toBe('wired');
		expect(signal?.play).toContain('order_value_expansion');
	});

	it('does NOT wire on Rebuy script/config loads', () => {
		expect(rebuyWiredMatcher.matchRequest(req('https://cdn.rebuyengine.com/onsite/js/rebuy.js'))).toBeNull();
		expect(rebuyWiredMatcher.matchRequest(req('https://cached.rebuyengine.com/api/v1/widgets/settings'))).toBeNull();
	});
});

describe('attentive wired matcher (SMS; verified on Magic Spoon)', () => {
	it('wires on the SMS subscribe beacon (identity captured)', () => {
		const signal = attentiveWiredMatcher.matchRequest(req('https://api.attentivemobile.com/1/subscribers'));
		expect(signal?.evidence_of_use).toBe('wired');
		expect(signal?.notes).toMatch(/identity/i);
	});

	it('wires on the track beacon (behavioral)', () => {
		expect(attentiveWiredMatcher.matchRequest(req('https://magicspoon-us.attn.tv/track'))?.evidence_of_use).toBe('wired');
	});

	it('does NOT wire on the Attentive script load', () => {
		expect(attentiveWiredMatcher.matchRequest(req('https://cdn.attn.tv/magicspoon/dtag.js'))).toBeNull();
	});
});

describe('meta wired matcher (intentionally inert: Shopify CAPI, no client-side /tr to verify)', () => {
	it('stays inert even on a plausible /tr URL, because we have no verified client-side shape', () => {
		expect(metaWiredMatcher.matchRequest(req('https://www.facebook.com/tr?id=100589946948288&ev=PageView'))).toBeNull();
	});
});
