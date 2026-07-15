import type { InspectorEvent, Signal } from './types';
import process from 'node:process';
import { inspect } from './core/inspect';

/**
 * Local dev harness. Streams an inspection to the terminal, or emits raw NDJSON with `--json`.
 * The NDJSON form doubles as the frontend dev's reference payload: real events, real shapes,
 * cheaper and truer than hand-written examples.
 */
async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const asJson = args.includes('--json');
	const url = args.find(arg => !arg.startsWith('--'));

	if (!url) {
		process.stderr.write('usage: npm run inspect -- <url> [--json]\n');
		process.exitCode = 2;
		return;
	}

	const controller = new AbortController();
	process.on('SIGINT', () => controller.abort());

	let failed = false;
	for await (const event of inspect({ url, signal: controller.signal })) {
		if (event.type === 'inspection.failed')
			failed = true;
		if (asJson)
			process.stdout.write(`${JSON.stringify(event)}\n`);
		else
			renderPretty(event);
	}

	process.exitCode = failed ? 1 : 0;
}

const DIM = '\x1B[2m';
const BOLD = '\x1B[1m';
const RESET = '\x1B[0m';

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

	const count = signal.evidence_total > 1 ? ` ×${signal.evidence_total}` : '';
	return `[${tier}] ${signal.id} (${who})${count}${detail ? ` ${DIM}${detail}${RESET}` : ''}`;
}

void main();
