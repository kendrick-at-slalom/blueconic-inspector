import type { Browser } from 'playwright';
import type { EvasionMode } from './evasion';
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

/**
 * Launches a Chromium that masks the headless tells (navigator.webdriver, absent plugins, the
 * `HeadlessChrome` UA, and the rest) that bot-detection uses to refuse interaction-gated beacons.
 * Without this, Klaviyo's "Viewed Product" and friends never fire on a headless crawl no matter how
 * convincingly it browses (verified — see decisionLog/antipatterns 2026-07-15).
 *
 * WHY this is isolated behind the gate: applying stealth IS bot-detection evasion, permitted only
 * when a prospect authorizes it for their own site (opt-in, default off). The plain crawl path in
 * `playwright.ts` neither imports nor reaches this module. The `mode.stealth` re-assertion is a
 * belt-and-suspenders guard so even a future direct caller can't spoof without an authorized mode.
 */
let pluginApplied = false;

export async function launchStealth(mode: EvasionMode, headless: boolean): Promise<Browser> {
	if (!mode.stealth)
		throw new Error('launchStealth called without an authorized evasion mode');

	if (!pluginApplied) {
		// `use` mutates the shared chromium instance, so apply the plugin once per process.
		chromium.use(StealthPlugin());
		pluginApplied = true;
	}

	return chromium.launch({ headless });
}
