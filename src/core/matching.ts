import type { Registry } from '../providers';
import type {
	DetectionMethod,
	Evidence,
	ObservedDom,
	ObservedGlobals,
	ObservedRequest,
	PlayId,
	Signal,
	SignalCategory,
	VendorEntry,
} from '../types';

/** Every category the tool assesses, so absence in any of them can be reported honestly. */
const ROLLUP_CATEGORIES: SignalCategory[] = [
	'esp',
	'sms',
	'exit_intent',
	'ad_pixel',
	'recs',
	'identity',
	'platform',
	'loyalty',
	'email_capture',
];

/** Match a request against the present-tier table (script URLs) and the wired matchers (beacons). */
export function matchRequest(req: ObservedRequest, registry: Registry, wiredIds: Set<string>): Signal[] {
	const out: Signal[] = [];
	const url = req.url.toLowerCase();

	for (const entry of registry.vendorTable) {
		const hit = entry.scriptUrlPatterns.some(pattern => url.includes(pattern.toLowerCase()));
		if (hit)
			out.push(presentSignal(entry, { kind: 'script', detail: req.url, timestamp: req.ts }, 'network', wiredIds));
	}

	for (const matcher of registry.wiredMatchers) {
		const signal = matcher.matchRequest(req);
		if (signal)
			out.push(signal);
	}

	return out;
}

/** Match settle-time observations: global names (fallback for vendors with no streaming URL) and DOM. */
export function matchSettled(
	dom: ObservedDom,
	globals: ObservedGlobals,
	registry: Registry,
	wiredIds: Set<string>,
	nowTs: number,
): Signal[] {
	const out: Signal[] = [];

	for (const entry of registry.vendorTable) {
		const hitName = entry.globalNames.find(name => globals[name] === true);
		if (hitName !== undefined)
			out.push(presentSignal(entry, { kind: 'global', detail: `window.${hitName}`, timestamp: nowTs }, 'js_global', wiredIds));
	}

	for (const matcher of registry.domMatchers) {
		const signal = matcher.matchDom(dom);
		if (signal)
			out.push(signal);
	}

	return out;
}

/**
 * A vendor's code is present. Whether it counts as `none` (we're watching for its beacon and
 * haven't seen one) or `unobservable` (no wired matcher exists, so we genuinely can't tell) hinges
 * on whether a wired matcher is registered for this id. That is the "installed, no evidence it
 * fires" vs "installed, couldn't verify use" split the render rule turns into copy.
 */
function presentSignal(entry: VendorEntry, evidence: Evidence, method: DetectionMethod, wiredIds: Set<string>): Signal {
	const watched = wiredIds.has(entry.id);
	return {
		id: entry.id,
		vendor: entry.vendor,
		category: entry.category,
		play: entry.play,
		mechanism_present: true,
		evidence_of_use: watched ? 'none' : 'unobservable',
		observability: 'observable',
		method,
		confidence: 0.6,
		evidence: [evidence],
		evidence_total: 1,
	};
}

/**
 * One rollup per category that matched nothing. On a clean crawl these are flat `observable`
 * absences ("no X detected"); on a failed or blocked crawl they are `unobserved` ("couldn't
 * detect"). Same guard as the per-signal rule: a failed look must never read as a real absence.
 */
export function buildRollups(
	registry: Registry,
	matchedCategories: Set<SignalCategory>,
	crawlOk: boolean,
): Signal[] {
	const out: Signal[] = [];
	for (const category of ROLLUP_CATEGORIES) {
		if (matchedCategories.has(category))
			continue;
		out.push({
			id: `${category}.__rollup`,
			vendor: null,
			category,
			play: playsForCategory(registry, category),
			mechanism_present: false,
			evidence_of_use: 'none',
			observability: crawlOk ? 'observable' : 'unobserved',
			method: 'network',
			confidence: crawlOk ? 0.9 : 0,
			evidence: [],
			evidence_total: 0,
			notes: crawlOk
				? 'No vendor detected in this category.'
				: 'Category not assessed; the crawl did not complete.',
		});
	}
	return out;
}

/** Plays a category informs, unioned from its table rows. Falls back to cart recovery for table-less categories (email capture). */
function playsForCategory(registry: Registry, category: SignalCategory): PlayId[] {
	const plays = new Set<PlayId>();
	for (const entry of registry.vendorTable) {
		if (entry.category === category) {
			for (const play of entry.play) plays.add(play);
		}
	}
	if (plays.size === 0)
		return ['cart_recovery'];
	return [...plays];
}

/** Global names to probe at settle, unioned across the table so the runner stays declarative. */
export function collectGlobalNames(registry: Registry): string[] {
	const names = new Set<string>();
	for (const entry of registry.vendorTable) {
		for (const name of entry.globalNames) names.add(name);
	}
	return [...names];
}
