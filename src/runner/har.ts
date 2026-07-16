import type { ObservedEvent, ObservedRequest, Runner } from '../types';
import { readFileSync } from 'node:fs';

/**
 * One request as captured in the beacon-capture format: `{ t, method, url, status, body }`.
 * `body` is the request POST payload (verified against Meta + Klaviyo beacons in the Magic
 * Spoon capture) — empty string for GET script loads.
 */
export interface CapturedRecord {
	t: string;
	method: string;
	url: string;
	status: number;
	body: string;
}

interface HarEntry {
	startedDateTime: string;
	request: { method: string; url: string; postData?: { text?: string } };
	response?: { status?: number };
}

interface HarDocument {
	log: { entries: HarEntry[] };
}

/**
 * Replays a captured session's requests through the same `Runner` interface Playwright
 * implements, so the core's matching logic can't tell a HAR replay from a live crawl.
 *
 * WHY this exists: Klaviyo/Attentive's discriminating beacons are interaction-gated (see
 * decisionLog 2026-07-15) — a headless observe-only crawl can't trigger them. Replaying a real
 * consented session is the deterministic, no-network way to exercise the `wired` tier in tests
 * and demos.
 *
 * LIMITATION, not a bug: this is a network-only replay. `settled` always carries an empty DOM
 * and no globals, because a beacon dump has neither. DOM matchers (`email_capture.presence`)
 * and globals-only vendors never match here — that's honest for what a network capture actually
 * contains, not something a richer parser would fix.
 */
export function createHarRunner(source: CapturedRecord[]): Runner {
	const records = [...source].sort((a, b) => Date.parse(a.t) - Date.parse(b.t));

	return {
		observe(url: string, signal?: AbortSignal): AsyncIterable<ObservedEvent> {
			return replay(records, url, signal);
		},
	};
}

async function* replay(
	records: CapturedRecord[],
	url: string,
	signal?: AbortSignal,
): AsyncGenerator<ObservedEvent> {
	for (const record of records) {
		if (signal?.aborted)
			return;
		yield { kind: 'request', req: toObservedRequest(record) };
	}
	// One settled event closes out the phase model. Empty DOM/globals: see the limitation above.
	yield { kind: 'settled', dom: { html: '', url }, globals: {} };
}

function toObservedRequest(record: CapturedRecord): ObservedRequest {
	return {
		url: record.url,
		method: record.method,
		resourceType: guessResourceType(record.url),
		postData: record.body || undefined,
		ts: Date.parse(record.t),
	};
}

/** Best-effort only — matching keys on `req.url` substrings, never on this field. */
function guessResourceType(url: string): string {
	const path = url.split('?')[0] ?? '';
	if (path.endsWith('.js'))
		return 'script';
	if (path.endsWith('.css'))
		return 'stylesheet';
	return 'other';
}

/**
 * Loads a capture file and normalizes it to `CapturedRecord[]`. Accepts either the flat
 * beacon-capture array (used as-is) or a W3C HAR (`{ log: { entries: [...] } }`), mapped down to
 * the same shape so `createHarRunner` never has to know which one it got.
 */
export function loadCapture(path: string): CapturedRecord[] {
	const raw = readFileSync(path, 'utf-8');
	const parsed: unknown = JSON.parse(raw);

	if (Array.isArray(parsed))
		return parsed as CapturedRecord[];

	if (isHarDocument(parsed)) {
		return parsed.log.entries.map(entry => ({
			t: entry.startedDateTime,
			method: entry.request.method,
			url: entry.request.url,
			status: entry.response?.status ?? 0,
			body: entry.request.postData?.text ?? '',
		}));
	}

	throw new Error(`loadCapture: unrecognized capture format at ${path}`);
}

function isHarDocument(value: unknown): value is HarDocument {
	if (value === null || typeof value !== 'object' || !('log' in value))
		return false;
	const log = (value as { log: unknown }).log;
	return log !== null && typeof log === 'object' && 'entries' in log;
}
