import { describe, expect, it } from 'vitest';
import { launchStealth } from '../../src/runner/stealth';

describe('launchStealth (defense-in-depth guard)', () => {
	it('refuses to launch without an authorized evasion mode', async () => {
		// Even a direct caller can't spoof: the guard trips before any Chromium is touched.
		await expect(
			launchStealth({ stealth: false, activeBrowse: false }, true),
		).rejects.toThrow(/authorized evasion mode/);
	});
});
