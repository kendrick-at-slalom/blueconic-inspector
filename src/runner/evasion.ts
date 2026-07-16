/**
 * The opt-in gate for bot-detection evasion.
 *
 * Stealth (spoofing headless tells) and active-browse (simulated human engagement) are bundled:
 * they only work together. Stealth without engagement won't trip interaction-gated beacons like
 * Klaviyo's "Viewed Product"; engagement without stealth is still bot-detected on a headless
 * browser. So one authorization turns on both, or neither runs.
 *
 * WHY the hard `=== true` check: evasion is a posture decision a prospect makes about their OWN
 * site (see decisionLog 2026-07-15) — it is off by default and must never engage by accident. Any
 * value other than the literal `true` (undefined, a truthy string, a stray object) leaves both
 * OFF. The runner reads only this resolved mode, so spoofing is unreachable without the flag.
 */
export interface EvasionMode {
	stealth: boolean;
	activeBrowse: boolean;
}

export function resolveEvasionMode(options: { activeBrowse?: unknown }): EvasionMode {
	const authorized = options.activeBrowse === true;
	return { stealth: authorized, activeBrowse: authorized };
}
