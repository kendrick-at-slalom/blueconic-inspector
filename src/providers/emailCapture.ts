import type { DomMatcher, Signal } from '../types';

/**
 * Presence of an email-capture field on the landing page. One of the few flat, unhedged
 * claims the tool can make: no email captured anywhere means off-site recovery is impossible
 * regardless of which ESP is installed.
 *
 * Presence only. Whether capture happens BEFORE the payment step is the ordering claim, and
 * that needs a checkout walk we don't do under observe-only, so it stays a deeper-audit item.
 * The match is a heuristic over the settled HTML rather than a live DOM query, which is honest
 * for "a field exists" and cheap.
 */
export const emailCaptureMatcher: DomMatcher = {
	id: 'cart.email_capture.presence',
	matchDom(doc): Signal | null {
		const html = doc.html;
		const hasTypedEmailInput = /<input[^>]+type\s*=\s*["']?email\b/i.test(html);
		const hasNamedEmailInput = /<input[^>]+(?:name|id|autocomplete|placeholder)\s*=\s*["'][^"']*e-?mail[^"']*["']/i.test(html);
		if (!hasTypedEmailInput && !hasNamedEmailInput)
			return null;

		return {
			id: 'cart.email_capture.presence',
			vendor: null,
			category: 'email_capture',
			play: ['cart_recovery'],
			mechanism_present: true,
			// We see the field, not its submission, so use is genuinely unobservable from outside.
			evidence_of_use: 'unobservable',
			observability: 'observable',
			method: 'dom',
			confidence: 0.7,
			evidence: [{
				kind: 'dom_node',
				detail: hasTypedEmailInput ? 'input[type="email"] on landing page' : 'input named/placeholdered for email on landing page',
				timestamp: Date.now(),
			}],
			evidence_total: 1,
			notes: 'Email capture field present. Whether it fires before the payment step needs a deeper audit.',
		};
	},
};
