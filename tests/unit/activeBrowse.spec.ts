import type { Page } from 'playwright';
import { describe, expect, it } from 'vitest';
import { simulateBrowsing } from '../../src/runner/activeBrowse';

/**
 * A fake Page that records every method the browse loop touches, including the mutating ones it must
 * never call. The observe-only guarantee is exactly this set: scroll, move, dwell — and nothing that
 * adds to a cart, submits a form, or navigates.
 */
function fakePage(calls: string[]): Page {
	const record = (name: string) => async (): Promise<void> => {
		calls.push(name);
	};
	const mouse = {
		move: record('mouse.move'),
		wheel: record('mouse.wheel'),
		// Forbidden — present so a stray call is caught, not silently missed.
		click: record('mouse.click'),
		down: record('mouse.down'),
		up: record('mouse.up'),
	};
	return {
		viewportSize: () => ({ width: 1280, height: 800 }),
		waitForTimeout: record('waitForTimeout'),
		mouse,
		click: record('click'),
		fill: record('fill'),
		goto: record('goto'),
		press: record('press'),
		type: record('type'),
	} as unknown as Page;
}

const OBSERVE_ONLY = new Set(['mouse.move', 'mouse.wheel', 'waitForTimeout']);

describe('simulateBrowsing (observe-only engagement)', () => {
	it('only scrolls, moves, and dwells — never clicks, fills, or navigates', async () => {
		const calls: string[] = [];
		await simulateBrowsing(fakePage(calls), undefined, { durationMs: 10 });

		expect(calls.length).toBeGreaterThan(0);
		for (const call of new Set(calls))
			expect(OBSERVE_ONLY.has(call)).toBe(true);
		// The two engagement signals Klaviyo/Attentive gate on must actually happen.
		expect(calls).toContain('mouse.move');
		expect(calls).toContain('mouse.wheel');
	});

	it('does nothing when the signal is already aborted', async () => {
		const calls: string[] = [];
		const controller = new AbortController();
		controller.abort();
		await simulateBrowsing(fakePage(calls), controller.signal, { durationMs: 10 });
		expect(calls).toEqual([]);
	});
});
