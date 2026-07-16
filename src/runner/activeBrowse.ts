import type { Page } from 'playwright';

/**
 * Simulated window-shopping: scroll, mouse movement, and dwell on the landing page, to convince
 * engagement-gated analytics (Klaviyo "Viewed Product", Attentive behavioral) that a human is
 * actually on the page rather than a robot that loaded and froze.
 *
 * Strictly observe-only: it never clicks, fills, submits, presses a key, or navigates — it browses,
 * it doesn't shop. That keeps it inside the crawler's no-mutation rule (no cart, no checkout, no
 * login, no form submit). The evasion posture lives in the stealth layer; this file only browses.
 */
export interface ActiveBrowseOptions {
	/** How long to keep engaging before handing back to settle. */
	durationMs?: number;
}

const DEFAULT_DURATION_MS = 20_000;

export async function simulateBrowsing(
	page: Page,
	signal?: AbortSignal,
	options: ActiveBrowseOptions = {},
): Promise<void> {
	const durationMs = options.durationMs ?? DEFAULT_DURATION_MS;
	const deadline = Date.now() + durationMs;
	const viewport = page.viewportSize() ?? { width: 1280, height: 800 };
	let step = 0;

	while (Date.now() < deadline) {
		if (signal?.aborted)
			return;

		// Jittered move somewhere in the central band of the viewport.
		const x = Math.round((0.15 + 0.7 * Math.random()) * viewport.width);
		const y = Math.round((0.15 + 0.7 * Math.random()) * viewport.height);
		await page.mouse.move(x, y, { steps: 8 });

		// Scroll down mostly, occasionally back up — real reading isn't monotonic.
		await page.mouse.wheel(0, step % 6 === 5 ? -280 : 340);

		await page.waitForTimeout(900 + Math.round(700 * Math.random()));
		step += 1;
	}
}
