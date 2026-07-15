import { describe, expect, it } from 'vitest';
import { createPushQueue } from '../../src/runner/eventQueue';

async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
	const out: T[] = [];
	for await (const item of iterable)
		out.push(item);
	return out;
}

describe('createPushQueue', () => {
	it('delivers items buffered before the consumer pulls', async () => {
		const q = createPushQueue<number>();
		q.push(1);
		q.push(2);
		q.close();
		expect(await collect(q)).toEqual([1, 2]);
	});

	it('delivers an item pushed after the consumer parks on an empty buffer', async () => {
		const q = createPushQueue<number>();
		const iterator = q[Symbol.asyncIterator]();
		const parked = iterator.next(); // no buffered item: this parks
		q.push(42);
		expect(await parked).toEqual({ value: 42, done: false });
		q.close();
		expect(await iterator.next()).toEqual({ value: undefined, done: true });
	});

	it('drains buffered items before surfacing a failure', async () => {
		const q = createPushQueue<number>();
		q.push(1);
		q.fail(new Error('boom'));
		const iterator = q[Symbol.asyncIterator]();
		expect(await iterator.next()).toEqual({ value: 1, done: false });
		await expect(iterator.next()).rejects.toThrow('boom');
	});

	it('drops nothing and duplicates nothing under interleaved push and pull', async () => {
		const q = createPushQueue<number>();
		const seen: number[] = [];
		const consumer = (async () => {
			for await (const item of q)
				seen.push(item);
		})();
		for (let i = 0; i < 100; i++)
			q.push(i);
		q.close();
		await consumer;
		expect(seen).toEqual(Array.from({ length: 100 }, (_, i) => i));
	});

	it('ignores pushes after close', async () => {
		const q = createPushQueue<number>();
		q.push(1);
		q.close();
		q.push(2); // no-op
		expect(await collect(q)).toEqual([1]);
	});
});
