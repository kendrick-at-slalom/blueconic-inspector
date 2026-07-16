import type { Browser, Page, Request, Response } from 'playwright';
import type {
	ObservedDom,
	ObservedEvent,
	ObservedGlobals,
	ObservedRequest,
	ObservedResponse,
	Runner,
} from '../types';
import type { PushQueue } from './eventQueue';
import { chromium } from 'playwright';
import { simulateBrowsing } from './activeBrowse';
import { classifyHttpStatus, classifyNavigationError, RunnerError } from './errors';
import { resolveEvasionMode } from './evasion';
import { createPushQueue } from './eventQueue';
import { launchStealth } from './stealth';

export interface PlaywrightRunnerOptions {
	/** Global names to probe at settle. Sourced from the vendor table so providers stay declarative. */
	globalNames?: string[];
	/** How long to let late-firing beacons land after network goes idle. */
	settleQuietMs?: number;
	/** Absolute ceiling on a single crawl. */
	hardCapMs?: number;
	headless?: boolean;
	/**
	 * Opt-in bot-evasion. `true` (and only `true`) turns on stealth + simulated browsing so
	 * interaction-gated beacons can fire; anything else keeps the crawl plain observe-only. Gated in
	 * `resolveEvasionMode` — the launch and browse paths read only the resolved mode.
	 */
	activeBrowse?: boolean;
	/** How long to simulate browsing before settling, when active-browse is authorized. */
	activeBrowseMs?: number;
}

const DEFAULT_SETTLE_QUIET_MS = 1500;
const DEFAULT_HARD_CAP_MS = 25_000;
const DEFAULT_ACTIVE_BROWSE_MS = 20_000;

export function createPlaywrightRunner(options: PlaywrightRunnerOptions = {}): Runner {
	const globalNames = options.globalNames ?? [];
	const settleQuietMs = options.settleQuietMs ?? DEFAULT_SETTLE_QUIET_MS;
	const hardCapMs = options.hardCapMs ?? DEFAULT_HARD_CAP_MS;
	const headless = options.headless ?? true;
	const activeBrowse = options.activeBrowse === true;
	const activeBrowseMs = options.activeBrowseMs ?? DEFAULT_ACTIVE_BROWSE_MS;

	return {
		observe(url: string, signal?: AbortSignal): AsyncIterable<ObservedEvent> {
			const queue = createPushQueue<ObservedEvent>();
			// Fire-and-forget: the crawl feeds the queue and closes it. Consumers pull via for-await.
			void drive({ url, globalNames, settleQuietMs, hardCapMs, headless, activeBrowse, activeBrowseMs }, queue, signal);
			return queue;
		},
	};
}

interface DriveConfig {
	url: string;
	globalNames: string[];
	settleQuietMs: number;
	hardCapMs: number;
	headless: boolean;
	activeBrowse: boolean;
	activeBrowseMs: number;
}

async function drive(config: DriveConfig, queue: PushQueue<ObservedEvent>, signal?: AbortSignal): Promise<void> {
	let browser: Browser | undefined;
	const onAbort = (): void => {
		// Tearing down the browser makes any in-flight navigation throw; drive() treats that as an abort, not a failure.
		void browser?.close().catch(() => {});
	};

	try {
		if (signal?.aborted) {
			queue.close();
			return;
		}
		const mode = resolveEvasionMode({ activeBrowse: config.activeBrowse });
		// The plain path never touches stealth code — spoofing is reachable only through the gate.
		browser = mode.stealth
			? await launchStealth(mode, config.headless)
			: await chromium.launch({ headless: config.headless });
		const context = await browser.newContext();
		const page = await context.newPage();
		signal?.addEventListener('abort', onAbort, { once: true });

		page.on('request', (req: Request) => {
			queue.push({ kind: 'request', req: toObservedRequest(req) });
		});
		page.on('response', (res: Response) => {
			queue.push({ kind: 'response', res: toObservedResponse(res) });
		});

		const response = await page.goto(config.url, {
			waitUntil: 'domcontentloaded',
			timeout: config.hardCapMs,
		});
		const status = response?.status() ?? 0;
		if (status >= 400)
			throw classifyHttpStatus(status);

		if (mode.activeBrowse) {
			// Engage BEFORE settling, so the beacons this browsing triggers stream as request events.
			await simulateBrowsing(page, signal, { durationMs: config.activeBrowseMs });
			if (signal?.aborted) {
				queue.close();
				return;
			}
		}

		await settle(page, config.settleQuietMs, config.hardCapMs);
		if (signal?.aborted) {
			queue.close();
			return;
		}

		const dom = await captureDom(page);
		const globals = await captureGlobals(page, config.globalNames);
		queue.push({ kind: 'settled', dom, globals });
		queue.close();
	}
	catch (error) {
		if (signal?.aborted)
			queue.close();
		else
			queue.fail(error instanceof RunnerError ? error : classifyNavigationError(error));
	}
	finally {
		signal?.removeEventListener('abort', onAbort);
		await browser?.close().catch(() => {});
	}
}

/**
 * Wait for the page to go quiet, then a beat longer for late beacons. `networkidle` can
 * never arrive on sites with long-polling or open sockets, so its timeout is expected and
 * swallowed; the hard cap is the real bound.
 */
async function settle(page: Page, quietMs: number, capMs: number): Promise<void> {
	const deadline = Date.now() + capMs;
	try {
		await page.waitForLoadState('networkidle', { timeout: Math.max(0, deadline - Date.now()) });
	}
	catch {
		// Expected on chatty sites; fall through to the fixed settle below.
	}
	const remaining = deadline - Date.now();
	if (remaining > 0)
		await page.waitForTimeout(Math.min(quietMs, remaining));
}

async function captureDom(page: Page): Promise<ObservedDom> {
	return { html: await page.content(), url: page.url() };
}

async function captureGlobals(page: Page, names: string[]): Promise<ObservedGlobals> {
	if (names.length === 0)
		return {};
	return page.evaluate((probeNames: string[]) => {
		const win = window as unknown as Record<string, unknown>;
		const out: Record<string, boolean> = {};
		for (const name of probeNames)
			out[name] = typeof win[name] !== 'undefined';
		return out;
	}, names);
}

function toObservedRequest(req: Request): ObservedRequest {
	return {
		url: req.url(),
		method: req.method(),
		resourceType: req.resourceType(),
		postData: req.postData() ?? undefined,
		ts: Date.now(),
	};
}

function toObservedResponse(res: Response): ObservedResponse {
	return { url: res.url(), status: res.status(), ts: Date.now() };
}
