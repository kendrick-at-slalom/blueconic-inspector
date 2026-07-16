import { describe, expect, it } from 'vitest';
import { parseArgs } from '../../src/cli';

describe('parseArgs (cli argument parsing)', () => {
	it('finds a bare url with no flags', () => {
		// Regression: with no --har, harFlagIndex is -1 and the url at index 0 used to be dropped.
		const r = parseArgs(['https://example.com/p']);
		expect(r.label).toBe('https://example.com/p');
		expect(r.harPath).toBeUndefined();
		expect(r.activeBrowse).toBe(false);
	});

	it('finds the url alongside --active-browse', () => {
		const r = parseArgs(['https://example.com/p', '--active-browse']);
		expect(r.label).toBe('https://example.com/p');
		expect(r.activeBrowse).toBe(true);
	});

	it('uses the har path as the label without mistaking it for the url', () => {
		const r = parseArgs(['--har', 'caps/x.json', '--json']);
		expect(r.harPath).toBe('caps/x.json');
		expect(r.label).toBe('caps/x.json');
		expect(r.asJson).toBe(true);
	});

	it('keeps the url when both a url and --har are given', () => {
		const r = parseArgs(['https://example.com/p', '--har', 'caps/x.json']);
		expect(r.label).toBe('https://example.com/p');
		expect(r.harPath).toBe('caps/x.json');
	});

	it('has no label when only flags are passed', () => {
		expect(parseArgs(['--json']).label).toBeUndefined();
	});
});
