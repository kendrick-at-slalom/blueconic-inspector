/**
 * Bridges a callback-style producer (Playwright's `page.on('request', ...)`) into a
 * single-consumer `AsyncIterable`, so the core can `for await` over browser events as
 * they fire instead of collecting them into a batch.
 *
 * This is the load-bearing piece of the streaming promise: get it wrong and the stream
 * either deadlocks (a parked consumer never resolves) or silently drops events (a push
 * lands with no consumer and no buffer). The invariant that keeps it honest: the buffer
 * and the waiter list are never both non-empty. A push either hands straight to a waiting
 * consumer or sits in the buffer.
 */
export interface PushQueue<T> extends AsyncIterable<T> {
	/** Enqueue an item. No-op once closed or failed; stop the producer first. */
	push: (item: T) => void;
	/** Normal end of stream. Buffered items drain first, then consumers see `done`. */
	close: () => void;
	/** Abnormal end. Buffered items drain first, then the next pull rejects with `error`. */
	fail: (error: Error) => void;
}

interface Waiter<T> {
	resolve: (result: IteratorResult<T>) => void;
	reject: (error: Error) => void;
}

export function createPushQueue<T>(): PushQueue<T> {
	const buffer: T[] = [];
	// Consumers parked on an empty buffer. Populated only while `buffer` is empty.
	const waiters: Waiter<T>[] = [];
	let closed = false;
	let failure: Error | null = null;

	function push(item: T): void {
		if (closed || failure)
			return;
		const waiter = waiters.shift();
		if (waiter)
			waiter.resolve({ value: item, done: false });
		else
			buffer.push(item);
	}

	function drainWaiters(fn: (waiter: Waiter<T>) => void): void {
		let waiter = waiters.shift();
		while (waiter) {
			fn(waiter);
			waiter = waiters.shift();
		}
	}

	function close(): void {
		if (closed || failure)
			return;
		closed = true;
		// Waiters exist only when the buffer is already empty, so resolving them done is safe.
		drainWaiters(waiter => waiter.resolve({ value: undefined, done: true }));
	}

	function fail(error: Error): void {
		if (closed || failure)
			return;
		failure = error;
		drainWaiters(waiter => waiter.reject(error));
	}

	async function next(): Promise<IteratorResult<T>> {
		// Buffered items are handed out before any close/fail is observed, so nothing is dropped.
		const buffered = buffer.shift();
		if (buffered !== undefined)
			return { value: buffered, done: false };
		if (failure)
			throw failure;
		if (closed)
			return { value: undefined, done: true };
		return new Promise<IteratorResult<T>>((resolve, reject) => {
			waiters.push({ resolve, reject });
		});
	}

	return {
		push,
		close,
		fail,
		[Symbol.asyncIterator](): AsyncIterator<T> {
			return { next };
		},
	};
}
