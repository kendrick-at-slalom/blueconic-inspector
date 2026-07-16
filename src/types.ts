/**
 * @blueconic/inspector — event & data contract
 *
 * This is the interface between the inspector and the frontend. It is the
 * contract; implementation follows it, not the other way round.
 *
 * Transport is either an in-process AsyncGenerator or SSE. Same events either way.
 */

// ─── Identity ────────────────────────────────────────────────────────────────

/** Growth plays a signal can inform. A signal may serve several. */
export type PlayId
	= | 'cart_recovery'
		| 'order_value_expansion'
		| 'retargeting_suppression'
		| 'churn_winback'
		| 'intelligent_prospecting';

export type SignalCategory
	= | 'esp'
		| 'sms'
		| 'exit_intent'
		| 'ad_pixel'
		| 'recs'
		| 'identity'
		| 'platform'
		| 'loyalty'
		| 'email_capture'
		| 'consent'
		| 'session_replay'
		| 'bot_defense';

/**
 * Stable signal IDs. Extend, never rename — the FE may key copy off these.
 * Convention: <surface>.<category>.<vendor|aspect>
 *
 *   cart.esp.klaviyo              cart.exit_intent.justuno
 *   cart.email_capture.presence   cart.email_capture.pre_payment
 *   ads.pixel.meta                ads.suppression.post_conversion
 *   checkout.step_count           checkout.guest_available
 *   platform.shopify              identity.blueconic
 *
 * Category rollups (see `signal.found` notes) use: <category>.__rollup
 */
export type SignalId = string;

// ─── The core distinction ────────────────────────────────────────────────────

/**
 * Did the vendor's mechanism actually get used?
 *
 *   confirmed    — trigger fired WITH an identified profile attached. Not in the
 *                  prototype (needs the attribution layer).
 *   wired        — a beacon fired, but no identity binding observed. Requires a
 *                  verified request shape for that vendor.
 *   none         — nothing beyond the script loading was seen.
 *   unobservable — we have no verified beacon shape for this vendor, so we
 *                  cannot tell. NOT the same as `none`.
 *
 * `mechanism_present: true` + `evidence_of_use: 'none'` is the Tier-"present"
 * case: the vendor is installed and there is no evidence it does anything.
 * That does NOT count as capability. Klaviyo is on nearly every Shopify store.
 */
export type EvidenceOfUse = 'confirmed' | 'wired' | 'none' | 'unobservable';

/**
 * Could we see this at all? This drives the FE's hedging, and getting it wrong
 * is how the tool tells a real retailer they're missing something they've run
 * for years.
 *
 *   observable             — we looked and could see. A negative here is a real
 *                            negative.
 *   unobserved             — we tried and couldn't tell (crawl failed, bot-walled,
 *                            phase errored). Never render this as absence.
 *   requires_interaction   — structurally invisible under the observe-only crawl
 *                            posture (e.g. anything needing a populated cart).
 *   not_observable_from_url — never visible from outside, at any crawl depth
 *                            (e.g. ad suppression for a converted cart).
 */
export type Observability
	= | 'observable'
		| 'unobserved'
		| 'requires_interaction'
		| 'not_observable_from_url';

/** How the signal was detected. */
export type DetectionMethod
	= 'network' | 'dom' | 'js_global' | 'platform_inference' | 'header';

// ─── Evidence ────────────────────────────────────────────────────────────────

/**
 * Substantiation. When a prospect's CTO says the audit is wrong, this is the
 * answer. Capped on merge (first + last + count) — Meta can fire dozens of
 * beacons per page load.
 */
export interface Evidence {
	kind: 'request' | 'script' | 'dom_node' | 'global' | 'cookie';
	/** URL, selector, or global name — enough to re-verify by hand. */
	detail: string;
	/** Originating script, when attribution is available. Not in the prototype. */
	attribution?: string;
	timestamp: number;
}

// ─── Signal ──────────────────────────────────────────────────────────────────

export interface Signal {
	id: SignalId;
	/** null for vendor-agnostic signals (e.g. email_capture.presence). */
	vendor: string | null;
	category: SignalCategory;
	/** A signal may inform several plays. Client taxonomy blurs boundaries; this is fine. */
	play: PlayId[];

	/** Did the vendor's code load at all? */
	mechanism_present: boolean;
	evidence_of_use: EvidenceOfUse;
	observability: Observability;

	method: DetectionMethod;
	/** 0..1 */
	confidence: number;
	/**
	 * Capped: at most first + last. See `evidence_total` for how many were
	 * actually seen.
	 */
	evidence: Evidence[];
	/**
	 * True count of matching observations as of THIS emit. May exceed
	 * `evidence.length`, which is capped.
	 *
	 * Not a live counter — signals re-emit on tier upgrade only (see
	 * `signal.found`), so this is a snapshot at upgrade time, not a running total.
	 * Don't render it as "currently N".
	 */
	evidence_total: number;
	notes?: string;
}

// ─── Events ──────────────────────────────────────────────────────────────────

export type Phase
	= 'resolve' | 'fetch' | 'render' | 'collect' | 'classify' | 'score';

export type FailureReason
	= | 'dns_failure'
		| 'http_error'
		| 'timeout'
		| 'bot_blocked'
		| 'login_wall'
		| 'not_ecommerce'
		| 'unknown';

export interface Summary {
	signalCount: number;
	byPlay: Partial<Record<PlayId, number>>;
	/** Categories where the crawl succeeded but nothing matched. */
	observableAbsences: SignalCategory[];
	/** Categories we could not assess. Render as "needs a deeper audit", not as gaps. */
	unobserved: SignalCategory[];
	durationMs: number;
}

export type InspectorEvent
	= | {
		type: 'inspection.started';
		inspectionId: string;
		url: string;
		ts: number;
	}
	| { type: 'phase.started'; phase: Phase; ts: number }
	/**
	 * Emitted as each signal lands — NOT batched.
	 *
	 * ⚠ A signal may be re-emitted with an upgraded tier and merged evidence
	 *   (e.g. `evidence_of_use: 'none'` → `'wired'` when a beacon fires after the
	 *   script was seen). KEY BY `signal.id` AND REPLACE, DO NOT APPEND — otherwise
	 *   an upgrade renders as two contradictory findings.
	 *
	 * ⚠ RE-EMIT TRIGGER: tier upgrade ONLY. Never re-emit on evidence
	 *   accumulation alone — Meta can fire dozens of /tr beacons per page load,
	 *   and one SSE event each would flood the stream. Once a signal reaches its
	 *   tier, further matching observations increment `evidence_total` silently
	 *   and emit nothing.
	 *
	 * ⚠ Rollups: categories in the vendor table with zero matches emit one
	 *   category-level signal (id `<category>.__rollup`, `mechanism_present: false`)
	 *   at the `classify` phase. `observability` distinguishes a real absence from
	 *   a failed look — see the render rule below.
	 */
	| { type: 'signal.found'; signal: Signal; ts: number }
	| { type: 'phase.completed'; phase: Phase; ts: number }
	| {
		type: 'inspection.completed';
		inspectionId: string;
		summary: Summary;
		ts: number;
	}
	| {
		type: 'inspection.failed';
		inspectionId: string;
		reason: FailureReason;
		/** Retryable (timeout, transient) vs. terminal (dns_failure, login_wall). */
		recoverable: boolean;
		ts: number;
	};

// ─── The render rule ─────────────────────────────────────────────────────────

/**
 * The whole point of the schema. Do not collapse these.
 *
 * | mechanism_present | evidence_of_use | observability          | Copy                                    |
 * |-------------------|-----------------|------------------------|-----------------------------------------|
 * | true              | 'wired'         | 'observable'           | "X is live"                             |
 * | true              | 'none'          | 'observable'           | "X installed, no evidence it fires" ★   |
 * | true              | 'unobservable'  | 'observable'           | "X installed, couldn't verify use"      |
 * | false             | 'none'          | 'observable'           | "No X detected"  ← flat claim, safe     |
 * | any               | any             | 'unobserved'           | "We couldn't detect X"  ← always hedge  |
 * | any               | any             | 'requires_interaction' | "Needs a deeper audit"  ← the CTA       |
 * | any               | any             | 'not_observable_from_url' | "Needs a deeper audit"  ← the CTA    |
 *
 * ★ is the product's core claim. Do not render it as "you have X".
 *
 * Never render `observability: 'unobserved'` as absence. A bot-walled crawl and
 * a genuinely bare site must not look the same.
 */

// ─── Provider-facing (FE can ignore below this line) ─────────────────────────

export interface ObservedRequest {
	url: string;
	method: string;
	resourceType: string;
	postData?: string;
	ts: number;
}

export interface ObservedResponse {
	url: string;
	status: number;
	ts: number;
}

export interface ObservedDom {
	html: string;
	url: string;
}

/** Snapshot of probed global names → presence. */
export type ObservedGlobals = Record<string, boolean>;

/**
 * `present`-tier detection is a TABLE, not code. One generic matcher walks these.
 * Adding a vendor = adding a row. Do not ration rows.
 *
 * Prefer `scriptUrlPatterns` over `globalNames` wherever the vendor loads from a
 * recognisable CDN: script matches stream as requests arrive, globals are only
 * visible at `settled` and contribute nothing to the live stream.
 */
export interface VendorEntry {
	id: SignalId;
	vendor: string | null;
	category: SignalCategory;
	play: PlayId[];
	/** Substring or regex source matched against request URLs. Preferred. */
	scriptUrlPatterns: string[];
	/** Fallback only — invisible until `settled`. */
	globalNames: string[];
}

/**
 * `wired`-tier detection is hand-written, per vendor, against a beacon shape
 * VERIFIED against real traffic. Prototype has exactly two: Klaviyo and Meta.
 *
 * Never write one of these from a remembered endpoint shape. A vendor with no
 * verified shape stays `evidence_of_use: 'unobservable'` — honest, and already
 * representable. A wrong guess produces a confidently false finding.
 */
export interface WiredMatcher {
	id: SignalId;
	/** Returns the upgraded signal, or null if this request isn't the beacon. */
	matchRequest: (req: ObservedRequest) => Signal | null;
}

/** DOM-based detection (e.g. cart.email_capture.presence). */
export interface DomMatcher {
	id: SignalId;
	matchDom: (doc: ObservedDom) => Signal | null;
}

/**
 * Runner emits DURING navigation. A `Promise<Observation>` shape would make the
 * whole stream a lie: generator real, SSE real, tests green, every signal
 * arriving at once after a 25s block.
 */
export type ObservedEvent
	= | { kind: 'request'; req: ObservedRequest }
		| { kind: 'response'; res: ObservedResponse }
		| { kind: 'settled'; dom: ObservedDom; globals: ObservedGlobals };

export interface Runner {
	observe: (url: string, signal?: AbortSignal) => AsyncIterable<ObservedEvent>;
}
