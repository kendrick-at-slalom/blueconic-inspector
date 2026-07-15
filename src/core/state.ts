import type {
	DetectionMethod,
	Evidence,
	EvidenceOfUse,
	Observability,
	PlayId,
	Signal,
	SignalCategory,
} from '../types';

/**
 * A vendor signal as the core currently understands it. Distinct from the emitted `Signal`:
 * this keeps only the first and last evidence items plus a running `count`, so `evidence_total`
 * can report the true number of observations while the emitted `evidence[]` stays capped.
 */
interface Tracked {
	id: string;
	vendor: string | null;
	category: SignalCategory;
	play: PlayId[];
	method: DetectionMethod;
	mechanismPresent: boolean;
	evidenceOfUse: EvidenceOfUse;
	observability: Observability;
	confidence: number;
	first: Evidence;
	last: Evidence;
	count: number;
	notes?: string;
}

const EVIDENCE_RANK: Record<EvidenceOfUse, number> = {
	confirmed: 4,
	wired: 3,
	none: 2,
	unobservable: 1,
};

/**
 * Holds every signal seen so far and enforces the re-emit rule: a tier upgrade re-emits, plain
 * accumulation does not. Once a signal reaches a tier, further matches only bump `evidence_total`;
 * without that, a Meta pixel firing dozens of beacons would flood the stream with dozens of events.
 */
export class MatchState {
	private readonly tracked = new Map<string, Tracked>();
	readonly matchedCategories = new Set<SignalCategory>();

	/**
	 * Fold one matcher result in. Returns the signal to emit on a first sighting or a tier upgrade,
	 * or null when the observation only accumulates (no new information for the frontend).
	 */
	ingest(candidate: Signal): Signal | null {
		const item = candidate.evidence[0];
		if (item === undefined)
			return null;

		const existing = this.tracked.get(candidate.id);
		if (!existing) {
			const fresh: Tracked = {
				id: candidate.id,
				vendor: candidate.vendor,
				category: candidate.category,
				play: candidate.play,
				method: candidate.method,
				mechanismPresent: candidate.mechanism_present,
				evidenceOfUse: candidate.evidence_of_use,
				observability: candidate.observability,
				confidence: candidate.confidence,
				first: item,
				last: item,
				count: 1,
				notes: candidate.notes,
			};
			this.tracked.set(candidate.id, fresh);
			this.matchedCategories.add(candidate.category);
			return toSignal(fresh);
		}

		existing.count += 1;
		existing.last = item;

		if (EVIDENCE_RANK[candidate.evidence_of_use] > EVIDENCE_RANK[existing.evidenceOfUse]) {
			existing.evidenceOfUse = candidate.evidence_of_use;
			existing.mechanismPresent = candidate.mechanism_present || existing.mechanismPresent;
			existing.observability = candidate.observability;
			existing.confidence = Math.max(existing.confidence, candidate.confidence);
			existing.method = candidate.method;
			if (candidate.notes)
				existing.notes = candidate.notes;
			return toSignal(existing);
		}

		// Same or lower tier: the count moved, nothing worth re-emitting did.
		return null;
	}

	emittedSignals(): Signal[] {
		return [...this.tracked.values()].map(toSignal);
	}

	get signalCount(): number {
		return this.tracked.size;
	}
}

function toSignal(t: Tracked): Signal {
	return {
		id: t.id,
		vendor: t.vendor,
		category: t.category,
		play: t.play,
		mechanism_present: t.mechanismPresent,
		evidence_of_use: t.evidenceOfUse,
		observability: t.observability,
		method: t.method,
		confidence: t.confidence,
		evidence: t.count <= 1 ? [t.first] : [t.first, t.last],
		evidence_total: t.count,
		notes: t.notes,
	};
}
