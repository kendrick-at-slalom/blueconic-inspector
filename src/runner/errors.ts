import type { FailureReason } from '../types';

/**
 * A crawl that couldn't produce observations, carrying the reason the core turns into an
 * `inspection.failed` event. `recoverable` splits "try again" (timeout, transient network)
 * from "terminal" (bad DNS, login wall), which the frontend surfaces as different UX.
 *
 * The core detects this structurally (a caught value with a valid `reason`), so it never
 * has to import the concrete runner. Nothing here couples detection logic to Playwright.
 */
export class RunnerError extends Error {
	readonly reason: FailureReason;
	readonly recoverable: boolean;

	constructor(reason: FailureReason, recoverable: boolean, message: string) {
		super(message);
		this.name = 'RunnerError';
		this.reason = reason;
		this.recoverable = recoverable;
	}
}

/** Map a Playwright navigation throw to a reason. Prototype-crude on purpose; the full taxonomy is October. */
export function classifyNavigationError(error: unknown): RunnerError {
	const message = error instanceof Error ? error.message : String(error);
	if (/ERR_NAME_NOT_RESOLVED|ENOTFOUND|getaddrinfo|ERR_ADDRESS_UNREACHABLE/i.test(message))
		return new RunnerError('dns_failure', false, message);
	if (/Timeout|timed out/i.test(message))
		return new RunnerError('timeout', true, message);
	if (/ERR_CONNECTION|ECONNREFUSED|ERR_ABORTED|ERR_SOCKET|ERR_NETWORK/i.test(message))
		return new RunnerError('http_error', true, message);
	return new RunnerError('unknown', false, message);
}

/** Map a >=400 main-document status to a reason. 401 reads as a login wall; 403/503 as bot blocking. */
export function classifyHttpStatus(status: number): RunnerError {
	if (status === 401)
		return new RunnerError('login_wall', false, `HTTP ${status}`);
	if (status === 403 || status === 503)
		return new RunnerError('bot_blocked', true, `HTTP ${status}`);
	// 404 is terminal; other 4xx/5xx may be transient.
	return new RunnerError('http_error', status !== 404, `HTTP ${status}`);
}
