# Conventions

## Naming

- Signal IDs are stable and append-only: extend, never rename. `<surface>.<category>.<vendor|aspect>`; rollups are `<category>.__rollup`. See `src/types.ts`.
- Phases are named for humans — the FE renders them as copy ("Checking ad pixels…").

## File Organization

- `src/{core,runner,providers,service}` map 1:1 to the future package split; treat them as package boundaries now.
- `core/` and `providers/` never import `service/`; providers never import `runner/` internals (the `Runner` interface is the seam). ESLint `no-restricted-imports` enforces this — keep the rule when scaffolding.
- Captured traffic (DevTools HARs, extracted beacon URLs, batch crawl NDJSON) lives in `docs/beacon-capture/` and `docs/crawl-results/`.

## Detection Patterns

- Adding a `present`-tier vendor = adding a `VendorEntry` row. Never write per-vendor code for presence.
- `wired` matchers are hand-written, one per vendor, only against a beacon shape verified in a real capture (a live crawl or DevTools HAR). No shape → the vendor stays `unobservable`. Wire behavioral or identity beacons, never session-init or script-load ones (see antipatterns).
- Prefer `scriptUrlPatterns` over `globalNames`: globals-only entries are invisible until `settled` and contribute nothing to the live stream.

## Bot-Evasion Posture (opt-in)

- Stealth and active-browse are coupled and OFF by default. The gate (`src/runner/evasion.ts` `resolveEvasionMode`) opens only on the literal `true` — any truthy-but-not-`true` value (`1`, `'yes'`, `{}`) stays disabled. Enforce inside the runner; `launchStealth` re-asserts the gate as defense in depth.
- Active-browse is observe-only: `mouse.move`/`wheel`/dwell, never click/fill/submit/navigate. The invariant is unit-tested against a spy page.
- The `--active-browse` flag maps to `InspectOptions.activeBrowse` (core, not the `types.ts` FE contract). Provenance — was `wired` reached via replay, evasion, or an organic crawl? — is surfaced via the CLI banner and logs, not in-payload (no contract touch).

## Error Handling

- A failed or partial look emits `observability: 'unobserved'` — never `absent`, never silence. This applies per-phase and to rollups.
- `inspection.failed` always carries a `FailureReason` and `recoverable`; map Playwright nav errors rather than rethrowing.
- Everything that opens a Chromium context must tear it down on abort (`AbortSignal` through `Runner.observe`); the SSE route aborts on `req.on('close')`.

## Testing

- Light by design: parameterized test over the vendor table, tier-boundary tests for `wired` matchers fed by verified beacon shapes, one core test on a scripted fake runner, one test on the callback→AsyncIterable queue. No live-site tests in the suite.
- Streaming is verified mechanically: at least one `signal.found` before `phase.completed` for `collect`. Timestamp spread is a soft signal only (the settle burst is legitimate).
