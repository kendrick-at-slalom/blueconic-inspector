import type { ServerResponse } from 'node:http';
import { createServer } from 'node:http';
import process from 'node:process';
import { inspect } from '../core/inspect';

/**
 * Thin SSE wrapper. The same events the in-process adapter yields, framed for EventSource.
 *
 * Three things here are load-bearing and easy to get silently wrong:
 *  - flushHeaders() so the response opens immediately instead of buffering until first flush.
 *  - no compression middleware on this route; a compressor batches SSE and kills the live feel.
 *  - the exact `event: <type>\ndata: <json>\n\n` frame; the blank line is what dispatches it.
 * And req 'close' aborts the crawl so an abandoned tab or curl Ctrl-C doesn't leak a browser.
 */
const PORT = Number(process.env.PORT ?? 8787);

const server = createServer((req, res) => {
	const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
	if (url.pathname !== '/inspect') {
		res.writeHead(404).end('not found');
		return;
	}
	const target = url.searchParams.get('url');
	if (!target) {
		res.writeHead(400).end('missing ?url=');
		return;
	}

	res.writeHead(200, {
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache',
		'Connection': 'keep-alive',
		'Access-Control-Allow-Origin': '*',
	});
	res.flushHeaders();

	const controller = new AbortController();
	req.on('close', () => controller.abort());

	void pump(target, controller.signal, res);
});

async function pump(target: string, signal: AbortSignal, res: ServerResponse): Promise<void> {
	try {
		for await (const event of inspect({ url: target, signal }))
			res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
	}
	catch (error) {
		// The generator itself turns crawl failures into inspection.failed events; this only
		// catches an unexpected throw so the socket still closes cleanly.
		const detail = error instanceof Error ? error.message : String(error);
		res.write(`event: inspection.failed\ndata: ${JSON.stringify({ type: 'inspection.failed', reason: 'unknown', recoverable: false, detail })}\n\n`);
	}
	finally {
		res.end();
	}
}

server.listen(PORT, () => {
	process.stdout.write(`inspector SSE listening on http://localhost:${PORT}/inspect?url=<url>\n`);
});
