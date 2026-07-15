import type { Registry } from '../../src/providers';
import type {
	InspectorEvent,
	ObservedEvent,
	ObservedRequest,
	Runner,
	Signal,
} from '../../src/types';
import { describe, expect, it } from 'vitest';
import { inspect } from '../../src/core/inspect';

function req(url: string): ObservedRequest {
	return { url, method: 'GET', resourceType: 'script', ts: 0 };
}

function metaWiredSignal(r: ObservedRequest): Signal {
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
		evidence: [{ kind: 'request', detail: r.url, timestamp: r.ts }],
		evidence_total: 1,
	};
}

// A small deterministic registry: Klaviyo present-only, Meta present + a wired beacon matcher.
const testRegistry: Registry = {
	vendorTable: [
		{ id: 'cart.esp.klaviyo', vendor: 'klaviyo', category: 'esp', play: ['cart_recovery'], scriptUrlPatterns: ['klaviyo.com'], globalNames: [] },
		{ id: 'ads.pixel.meta', vendor: 'meta', category: 'ad_pixel', play: ['retargeting_suppression'], scriptUrlPatterns: ['facebook.net'], globalNames: [] },
	],
	wiredMatchers: [
		{ id: 'ads.pixel.meta', matchRequest: r => (r.url.includes('facebook.com/tr') ? metaWiredSignal(r) : null) },
	],
	domMatchers: [],
};

function fakeRunner(events: ObservedEvent[], error?: unknown): Runner {
	return {
		observe(): AsyncIterable<ObservedEvent> {
			return (async function* () {
				for (const event of events)
					yield event;
				if (error !== undefined)
					throw error;
			})();
		},
	};
}

async function run(events: ObservedEvent[], error?: unknown): Promise<InspectorEvent[]> {
	const out: InspectorEvent[] = [];
	const stream = inspect({
		url: 'https://example.test',
		registry: testRegistry,
		runner: fakeRunner(events, error),
		now: () => 1000,
		inspectionId: 'test',
	});
	for await (const event of stream)
		out.push(event);
	return out;
}

function signals(events: InspectorEvent[]): Signal[] {
	return events.filter((e): e is Extract<InspectorEvent, { type: 'signal.found' }> => e.type === 'signal.found').map(e => e.signal);
}

const settled: ObservedEvent = { kind: 'settled', dom: { html: '', url: 'https://example.test' }, globals: {} };

describe('inspect orchestration', () => {
	it('emits at least one signal before the collect phase completes (the streaming gate)', async () => {
		const events = await run([
			{ kind: 'request', req: req('https://static.klaviyo.com/x.js') },
			{ kind: 'request', req: req('https://connect.facebook.net/fbevents.js') },
			settled,
		]);
		const firstSignal = events.findIndex(e => e.type === 'signal.found');
		const collectDone = events.findIndex(e => e.type === 'phase.completed' && e.phase === 'collect');
		expect(firstSignal).toBeGreaterThanOrEqual(0);
		expect(firstSignal).toBeLessThan(collectDone);
	});

	it('re-emits on a tier upgrade but stays silent on further accumulation', async () => {
		const events = await run([
			{ kind: 'request', req: req('https://connect.facebook.net/fbevents.js') }, // present
			{ kind: 'request', req: req('https://www.facebook.com/tr?ev=PageView') }, // beacon -> upgrade
			{ kind: 'request', req: req('https://www.facebook.com/tr?ev=ViewContent') }, // beacon -> silent
			settled,
		]);
		const meta = signals(events).filter(s => s.id === 'ads.pixel.meta');
		expect(meta).toHaveLength(2); // present, then the upgrade; the third observation emits nothing
		expect(meta[0]?.evidence_of_use).toBe('none');
		expect(meta[1]?.evidence_of_use).toBe('wired');
		// True count as of the upgrade emit: the present sighting plus the first beacon.
		expect(meta[1]?.evidence_total).toBe(2);
		// evidence[] stays capped even as the count climbs.
		expect(meta[1]?.evidence.length).toBeLessThanOrEqual(2);
	});

	it('rolls up unmatched categories as observable absences on a clean crawl', async () => {
		const events = await run([settled]);
		const rollups = signals(events).filter(s => s.id.endsWith('.__rollup'));
		expect(rollups.length).toBeGreaterThan(0);
		expect(rollups.every(r => r.observability === 'observable')).toBe(true);
		expect(rollups.every(r => r.mechanism_present === false)).toBe(true);
		const completed = events.find(e => e.type === 'inspection.completed');
		expect(completed?.type).toBe('inspection.completed');
	});

	it('on failure, rolls up unmatched categories as unobserved (never absent) and reports the reason', async () => {
		const events = await run(
			[{ kind: 'request', req: req('https://static.klaviyo.com/x.js') }],
			{ reason: 'bot_blocked', recoverable: true },
		);
		const failed = events.find(e => e.type === 'inspection.failed');
		expect(failed).toMatchObject({ type: 'inspection.failed', reason: 'bot_blocked', recoverable: true });

		const rollups = signals(events).filter(s => s.id.endsWith('.__rollup'));
		expect(rollups.length).toBeGreaterThan(0);
		// The guard: a failed look is unobserved, never a flat observable absence.
		expect(rollups.every(r => r.observability === 'unobserved')).toBe(true);
		// A category that DID match before the failure (esp, via Klaviyo) is not rolled up at all.
		expect(rollups.some(r => r.category === 'esp')).toBe(false);
	});
});
