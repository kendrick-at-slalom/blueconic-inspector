import type { InspectorEvent, Signal } from './types';
import process from 'node:process';
import { inspect } from './core/inspect';
import { createHarRunner, loadCapture } from './runner/har';

const DIM = '\x1B[2m';
const BOLD = '\x1B[1m';
const RESET = '\x1B[0m';

/**
 * Local dev harness. Streams an inspection to the terminal, or emits raw NDJSON with `--json`.
 * The NDJSON form doubles as the frontend dev's reference payload: real events, real shapes,
 * cheaper and truer than hand-written examples.
 *
 * `--har <path>` swaps the Playwright runner for a HarRunner replaying a captured session — the
 * deterministic way to see the `wired` tier light up without a live, interaction-gated crawl.
 *
 * `--active-browse` authorizes bot-evasion (stealth + simulated browsing) for THIS run, so a live
 * crawl can trigger interaction-gated beacons. Off by default; only for a prospect's own site.
 */
async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const asJson = args.includes('--json');
	const activeBrowse = args.includes('--active-browse');
	const harFlagIndex = args.indexOf('--har');
	const harPath = harFlagIndex >= 0 ? args[harFlagIndex + 1] : undefined;
	// The har path fills the positional url slot, so exclude it from the url search below.
	const url = args.find((arg, i) => !arg.startsWith('--') && i !== harFlagIndex + 1);

	const label = url ?? harPath;
	if (!label) {
		process.stderr.write('usage: npm run inspect -- <url> [--json] [--active-browse]  |  --har <path> [--json]\n');
		process.exitCode = 2;
		return;
	}

	const controller = new AbortController();
	process.on('SIGINT', () => controller.abort());

	const runner = harPath ? createHarRunner(loadCapture(harPath)) : undefined;
	if (activeBrowse && !runner)
		process.stderr.write(`${BOLD}⚠ active-browse ON — stealth + simulated browsing enabled for this run (bot-evasion; authorized per-site)${RESET}\n`);

	let failed = false;
	for await (const event of inspect({ url: label, runner, signal: controller.signal, activeBrowse })) {
		if (event.type === 'inspection.failed')
			failed = true;
		if (asJson)
			process.stdout.write(`${JSON.stringify(event)}\n`);
		else
			renderPretty(event);
	}

	process.exitCode = failed ? 1 : 0;
}

function renderPretty(event: InspectorEvent): void {
	switch (event.type) {
		case 'inspection.started':
			process.stdout.write(`${BOLD}▶ ${event.url}${RESET}\n`);
			break;
		case 'phase.started':
			process.stdout.write(`${DIM}  … ${event.phase}${RESET}\n`);
			break;
		case 'phase.completed':
			break;
		case 'signal.found':
			process.stdout.write(`  ${describe(event.signal)}\n`);
			break;
		case 'inspection.completed': {
			const s = event.summary;
			process.stdout.write(`${BOLD}✔ ${s.signalCount} signals in ${s.durationMs}ms${RESET}\n`);
			if (s.observableAbsences.length)
				process.stdout.write(`${DIM}  absent: ${s.observableAbsences.join(', ')}${RESET}\n`);
			if (s.unobserved.length)
				process.stdout.write(`${DIM}  unobserved: ${s.unobserved.join(', ')}${RESET}\n`);
			break;
		}
		case 'inspection.failed':
			process.stdout.write(`${BOLD}✖ ${event.reason} (recoverable=${event.recoverable})${RESET}\n`);
			break;
	}
}

/** A factual one-liner from the schema's own vocabulary. Not scoring copy; that's the rubric owner's. */
function describe(signal: Signal): string {
	const who = signal.vendor ?? signal.category;
	const detail = signal.evidence[0]?.detail ?? '';
	let tier: string;
	if (signal.observability === 'unobserved')
		tier = 'unobserved';
	else if (!signal.mechanism_present)
		tier = 'absent';
	else if (signal.evidence_of_use === 'wired' || signal.evidence_of_use === 'confirmed')
		tier = signal.evidence_of_use;
	else if (signal.evidence_of_use === 'none')
		tier = 'present, no use seen';
	else
		tier = 'present, use unverified';

	// `×N` is `evidence_total`: a SNAPSHOT of matching observations counted at the moment this signal
	// last upgraded tier, not the number of beacons that fired. Signals re-emit only on tier upgrade
	// (contract), so post-upgrade beacons bump the internal count silently and never move this display.
	// The count also folds in present-tier script matches where a vendor's script pattern overlaps its
	// beacon URL (e.g. Meta's `facebook.com/tr` is both), so read `×N` as "activity depth at upgrade",
	// never as an event tally.
	const count = signal.evidence_total > 1 ? ` ×${signal.evidence_total}` : '';
	return `[${tier}] ${signal.id} (${who})${count}${detail ? ` ${DIM}${detail}${RESET}` : ''}`;
}

void main();
