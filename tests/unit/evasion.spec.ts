import { describe, expect, it } from 'vitest';
import { resolveEvasionMode } from '../../src/runner/evasion';

describe('resolveEvasionMode (the opt-in bot-evasion gate)', () => {
	it('leaves stealth and active-browse off by default', () => {
		expect(resolveEvasionMode({})).toEqual({ stealth: false, activeBrowse: false });
	});

	it('opens the gate only for the literal true', () => {
		// A truthy-but-not-true value must never spoof — this is the whole safety guarantee.
		for (const value of [1, 'yes', 'true', {}, [], 'on']) {
			expect(resolveEvasionMode({ activeBrowse: value })).toEqual({ stealth: false, activeBrowse: false });
		}
	});

	it('couples stealth and active-browse on together when authorized', () => {
		expect(resolveEvasionMode({ activeBrowse: true })).toEqual({ stealth: true, activeBrowse: true });
	});
});
