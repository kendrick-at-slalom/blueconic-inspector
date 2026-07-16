import type { CapturedRecord } from '../../src/runner/har';
import type { InspectorEvent, Signal } from '../../src/types';
import { describe, expect, it } from 'vitest';
import { inspect } from '../../src/core/inspect';
import { defaultRegistry } from '../../src/providers';
import { createHarRunner, loadCapture } from '../../src/runner/har';

function rec(t: string, method: string, url: string, body = ''): CapturedRecord {
	return { t, method, url, status: 200, body };
}

function signals(events: InspectorEvent[]): Signal[] {
	return events
		.filter((e): e is Extract<InspectorEvent, { type: 'signal.found' }> => e.type === 'signal.found')
		.map(e => e.signal);
}

async function run(records: CapturedRecord[], label = 'fixture'): Promise<InspectorEvent[]> {
	const out: InspectorEvent[] = [];
	const stream = inspect({
		url: label,
		runner: createHarRunner(records),
		registry: defaultRegistry,
		now: () => 1000,
		inspectionId: 'test',
	});
	for await (const event of stream)
		out.push(event);
	return out;
}

// Hand-written, covering one beacon shape per verified vendor plus 3 duplicate Klaviyo
// client/events records to exercise silent accumulation. Ordering matches a real session:
// script loads first, behavioral beacons follow.
const FIXTURE: CapturedRecord[] = [
	rec('2026-07-16T00:00:00.000Z', 'GET', 'https://static.klaviyo.com/onsite/js/klaviyo.js'),
	rec('2026-07-16T00:00:01.000Z', 'POST', 'https://a.klaviyo.com/client/events/?company_id=X'),
	rec('2026-07-16T00:00:02.000Z', 'POST', 'https://a.klaviyo.com/client/events/?company_id=X'),
	rec('2026-07-16T00:00:03.000Z', 'POST', 'https://a.klaviyo.com/client/events/?company_id=X'),
	rec('2026-07-16T00:00:04.000Z', 'POST', 'https://a.klaviyo.com/client/profiles/?company_id=X'),
	rec('2026-07-16T00:00:05.000Z', 'POST', 'https://rebuyengine.com/api/v2/analytics/event/bulk'),
	rec('2026-07-16T00:00:06.000Z', 'POST', 'https://api.attentivemobile.com/1/subscribers'),
	rec('2026-07-16T00:00:07.000Z', 'POST', 'https://magicspoon-us.attn.tv/track'),
	rec('2026-07-16T00:00:08.000Z', 'POST', 'https://www.facebook.com/tr/', 'id=123&ev=PageView'),
];

describe('harRunner + real registry (inline fixture)', () => {
	it('wires Klaviyo, Rebuy, Attentive, and Meta', async () => {
		const wired = signals(await run(FIXTURE)).filter(s => s.evidence_of_use === 'wired');
		const ids = new Set(wired.map(s => s.id));
		expect(ids).toEqual(new Set(['cart.esp.klaviyo', 'recs.recs.rebuy', 'cart.sms.attentive', 'ads.pixel.meta']));
	});

	it('emits at least one signal before the collect phase completes (the streaming invariant)', async () => {
		const events = await run(FIXTURE);
		const firstSignal = events.findIndex(e => e.type === 'signal.found');
		const collectDone = events.findIndex(e => e.type === 'phase.completed' && e.phase === 'collect');
		expect(firstSignal).toBeGreaterThanOrEqual(0);
		expect(firstSignal).toBeLessThan(collectDone);
	});

	it('accumulates silently: 3 duplicate client/events records collapse into one wired emit', async () => {
		const klaviyo = signals(await run(FIXTURE)).filter(s => s.id === 'cart.esp.klaviyo');
		const wiredEmits = klaviyo.filter(s => s.evidence_of_use === 'wired');
		// One upgrade emit, not one per matching record (the script load plus 4 more beacons
		// after the first client/events all land silently on evidence_total).
		expect(wiredEmits).toHaveLength(1);
		expect(wiredEmits[0]?.evidence_total).toBe(3);
		expect(wiredEmits[0]?.evidence.length).toBeLessThanOrEqual(2);
	});
});

describe('harRunner + loadCapture (golden: the real Magic Spoon capture)', () => {
	it('wires the four verified vendors from docs/beacon-capture/magicspoon-beacons.json', async () => {
		const records = loadCapture('docs/beacon-capture/magicspoon-beacons.json');
		const wired = signals(await run(records, 'magicspoon')).filter(s => s.evidence_of_use === 'wired');
		const ids = new Set(wired.map(s => s.id));
		expect(ids).toEqual(new Set(['cart.esp.klaviyo', 'recs.recs.rebuy', 'cart.sms.attentive', 'ads.pixel.meta']));
	});
});
