import type { Registry } from '../providers';
import type {
	FailureReason,
	InspectorEvent,
	ObservedDom,
	ObservedGlobals,
	PlayId,
	Runner,
	Signal,
	Summary,
} from '../types';
import { defaultRegistry } from '../providers';
import { buildRollups, collectGlobalNames, matchRequest, matchSettled } from './matching';
import { MatchState } from './state';

export interface InspectOptions {
	url: string;
	/** Injectable for tests; defaults to the Playwright runner seeded from the registry's globals. */
	runner?: Runner;
	/** Injectable for tests; defaults to the full vendor table + wired/DOM matchers. */
	registry?: Registry;
	/** Cancels the crawl and tears down the browser (the SSE route wires this to client disconnect). */
	signal?: AbortSignal;
	inspectionId?: string;
	/** Clock injection so tests get deterministic timestamps. */
	now?: () => number;
}

/**
 * The core: a URL in, a stream of typed events out, same events whether consumed in-process or
 * over SSE. Signals emit as they land: present-tier during the fetch phase as requests arrive,
 * settle-time matches during collect, absence rollups during classify. Nothing is batched.
 */
export async function* inspect(options: InspectOptions): AsyncGenerator<InspectorEvent> {
	const registry = options.registry ?? defaultRegistry;
	const now = options.now ?? (() => Date.now());
	const inspectionId = options.inspectionId ?? `insp_${now().toString(36)}`;
	const wiredIds = new Set(registry.wiredMatchers.map(m => m.id));
	const state = new MatchState();
	const startTs = now();

	yield { type: 'inspection.started', inspectionId, url: options.url, ts: now() };

	const runner = options.runner ?? await createDefaultRunner(registry);

	yield { type: 'phase.started', phase: 'resolve', ts: now() };
	yield { type: 'phase.completed', phase: 'resolve', ts: now() };
	yield { type: 'phase.started', phase: 'fetch', ts: now() };

	let settled: { dom: ObservedDom; globals: ObservedGlobals } | null = null;
	try {
		for await (const event of runner.observe(options.url, options.signal)) {
			if (event.kind === 'request') {
				for (const candidate of matchRequest(event.req, registry, wiredIds)) {
					const emit = state.ingest(candidate);
					if (emit)
						yield { type: 'signal.found', signal: emit, ts: now() };
				}
			}
			else if (event.kind === 'settled') {
				settled = { dom: event.dom, globals: event.globals };
			}
			// `response` events carry no matcher today; they exist for future status-based signals.
		}
	}
	catch (error) {
		// Silent-under-report guard: a failed crawl reports unmatched categories as `unobserved`,
		// never as absence, so a bot wall can't masquerade as a clean bill of health.
		yield { type: 'phase.started', phase: 'classify', ts: now() };
		for (const rollup of buildRollups(registry, state.matchedCategories, false))
			yield { type: 'signal.found', signal: rollup, ts: now() };
		yield { type: 'phase.completed', phase: 'classify', ts: now() };

		const { reason, recoverable } = toFailure(error);
		yield { type: 'inspection.failed', inspectionId, reason, recoverable, ts: now() };
		return;
	}

	yield { type: 'phase.completed', phase: 'fetch', ts: now() };

	yield { type: 'phase.started', phase: 'render', ts: now() };
	yield { type: 'phase.completed', phase: 'render', ts: now() };

	yield { type: 'phase.started', phase: 'collect', ts: now() };
	if (settled) {
		for (const candidate of matchSettled(settled.dom, settled.globals, registry, wiredIds, now())) {
			const emit = state.ingest(candidate);
			if (emit)
				yield { type: 'signal.found', signal: emit, ts: now() };
		}
	}
	yield { type: 'phase.completed', phase: 'collect', ts: now() };

	yield { type: 'phase.started', phase: 'classify', ts: now() };
	const rollups = buildRollups(registry, state.matchedCategories, true);
	for (const rollup of rollups)
		yield { type: 'signal.found', signal: rollup, ts: now() };
	yield { type: 'phase.completed', phase: 'classify', ts: now() };

	yield { type: 'phase.started', phase: 'score', ts: now() };
	const summary = buildSummary(state, rollups, startTs, now());
	yield { type: 'phase.completed', phase: 'score', ts: now() };

	yield { type: 'inspection.completed', inspectionId, summary, ts: now() };
}

async function createDefaultRunner(registry: Registry): Promise<Runner> {
	// Lazy import keeps Playwright out of the module graph for unit tests that inject a fake runner.
	const { createPlaywrightRunner } = await import('../runner/playwright');
	return createPlaywrightRunner({ globalNames: collectGlobalNames(registry) });
}

function buildSummary(state: MatchState, rollups: Signal[], startTs: number, endTs: number): Summary {
	const byPlay: Partial<Record<PlayId, number>> = {};
	for (const signal of state.emittedSignals()) {
		for (const play of signal.play)
			byPlay[play] = (byPlay[play] ?? 0) + 1;
	}
	return {
		signalCount: state.signalCount,
		byPlay,
		observableAbsences: rollups.filter(r => r.observability === 'observable').map(r => r.category),
		unobserved: rollups.filter(r => r.observability === 'unobserved').map(r => r.category),
		durationMs: endTs - startTs,
	};
}

const FAILURE_REASONS: FailureReason[] = [
	'dns_failure',
	'http_error',
	'timeout',
	'bot_blocked',
	'login_wall',
	'not_ecommerce',
	'unknown',
];

/** Read a RunnerError-shaped throw structurally, so the core never imports the concrete runner. */
function toFailure(error: unknown): { reason: FailureReason; recoverable: boolean } {
	if (error !== null && typeof error === 'object' && 'reason' in error) {
		const reason = (error as { reason: unknown }).reason;
		if (typeof reason === 'string' && (FAILURE_REASONS as string[]).includes(reason)) {
			const recoverable = 'recoverable' in error
				? Boolean((error as { recoverable?: unknown }).recoverable)
				: false;
			return { reason: reason as FailureReason, recoverable };
		}
	}
	return { reason: 'unknown', recoverable: false };
}
