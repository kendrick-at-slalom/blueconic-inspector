# Conventions

## Naming

- Signal IDs are stable and append-only: extend, never rename. `<surface>.<category>.<vendor|aspect>`; rollups are `<category>.__rollup`. See `src/types.ts`.
- Phases are named for humans — the FE renders them as copy ("Checking ad pixels…").

## File Organization

- `src/{core,runner,providers,service}` map 1:1 to the future package split; treat them as package boundaries now.
- `core/` and `providers/` never import `service/`; providers never import `runner/` internals (the `Runner` interface is the seam). ESLint `no-restricted-imports` enforces this — keep the rule when scaffolding.
- Probe output and (later) recorded HARs live in `fixtures/`.

## Detection Patterns

- Adding a `present`-tier vendor = adding a `VendorEntry` row. Never write per-vendor code for presence.
- `wired` matchers are hand-written, one per vendor, only against a beacon shape verified in a probe fixture. No shape → the vendor stays `unobservable`.
- Prefer `scriptUrlPatterns` over `globalNames`: globals-only entries are invisible until `settled` and contribute nothing to the live stream.

## Error Handling

- A failed or partial look emits `observability: 'unobserved'` — never `absent`, never silence. This applies per-phase and to rollups.
- `inspection.failed` always carries a `FailureReason` and `recoverable`; map Playwright nav errors rather than rethrowing.
- Everything that opens a Chromium context must tear it down on abort (`AbortSignal` through `Runner.observe`); the SSE route aborts on `req.on('close')`.

## Testing

- Light by design: parameterized test over the vendor table, tier-boundary tests for `wired` matchers fed by probe fixtures, one core test on a scripted fake runner, one test on the callback→AsyncIterable queue. No live-site tests in the suite.
- Streaming is verified mechanically: at least one `signal.found` before `phase.completed` for `collect`. Timestamp spread is a soft signal only (the settle burst is legitimate).
