import type { DomMatcher, VendorEntry, WiredMatcher } from '../types';
import { emailCaptureMatcher } from './emailCapture';
import { vendorTable } from './vendorTable';
import { attentiveWiredMatcher } from './wired/attentive';
import { klaviyoWiredMatcher } from './wired/klaviyo';
import { metaWiredMatcher } from './wired/meta';
import { rebuyWiredMatcher } from './wired/rebuy';

/** Everything the core matches against. Injectable so tests can pass a tiny table. */
export interface Registry {
	vendorTable: VendorEntry[];
	wiredMatchers: WiredMatcher[];
	domMatchers: DomMatcher[];
}

export const defaultRegistry: Registry = {
	vendorTable,
	wiredMatchers: [metaWiredMatcher, klaviyoWiredMatcher, rebuyWiredMatcher, attentiveWiredMatcher],
	domMatchers: [emailCaptureMatcher],
};

export { emailCaptureMatcher, vendorTable };
