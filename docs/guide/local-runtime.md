---
outline: deep
---

# Local Runtime

Vegas includes a local Apps Script-oriented runtime to shorten the development feedback loop. It models selected Apps Script APIs closely enough for supported server-side code to participate in local development and preview workflows.

The Local Runtime is **not** a copy of the Google Apps Script production runtime and is not intended to reproduce undocumented Google behavior.

## How to Use It

Use the Local Runtime for fast feedback while developing code that uses APIs Vegas currently models. Treat deployed Google Apps Script as a separate execution environment whose behavior is governed by Google's public platform contract.

The current API inventory and structural coverage are listed in [Runtime API coverage](./runtime-api-coverage).

## Behavior Categories

Structural coverage answers whether a method exists in the Vegas Runtime. Behavior status answers what kind of implementation that method has. These are deliberately separate.

| Status            | Meaning                                                                                                                                               |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `implemented`     | Implements the documented public contract with no known Local Runtime-specific semantic difference.                                                   |
| `local-emulation` | Provides the documented capability through a local model or local platform implementation, so observable behavior can differ from Google Apps Script. |
| `no-op`           | Intentionally accepts the operation without producing a side effect.                                                                                  |
| `fail-closed`     | Rejects an operation that Vegas cannot represent faithfully rather than returning an approximation.                                                   |

An API can therefore be structurally present without being classified as `implemented`.

## Auditing and Verification

Vegas keeps two different ideas separate:

- **Audited** means the Runtime implementation and its behavior category have been reviewed against public sources.
- **Contract-tested** means an explicit automated test checks behavior derived from a publicly documented contract.

Contract tests may use sources such as:

- Google Apps Script official documentation.
- `@types/google-apps-script` for the declared TypeScript surface.
- Public standards such as RFCs.
- Public Java specifications where an Apps Script API explicitly depends on Java-defined behavior.

### No Production Runtime Oracle

Vegas does not use the production Google Apps Script runtime as a behavioral oracle for Local Runtime development.

In particular, Vegas does not build compatibility behavior by probing production Apps Script for undocumented defaults, edge cases, serialization details, exception behavior, or other internal semantics. This keeps the Local Runtime grounded in public contracts instead of reverse engineering the production environment.

Running an application on Google Apps Script for normal application testing is separate from using the production runtime to discover undocumented behavior for Vegas itself.

## Reading API Coverage

The generated coverage page reports several independent measurements:

1. **Structural method coverage** — how many declared methods have a Vegas Runtime implementation.
2. **Enum surface coverage** — which enum properties exposed by Global Objects are present.
3. **Audited behavior** — how reviewed methods are classified as `implemented`, `local-emulation`, `no-op`, or `fail-closed`.
4. **Contract-tested methods** — how many audited methods have explicit tests grounded in public contracts.

These numbers should not be combined into a single compatibility score. In particular, 100% structural coverage does not mean the Local Runtime is behaviorally identical to Google Apps Script.

## Why Vegas Fails Closed

Some Apps Script behavior depends on Google infrastructure or on semantics that public documentation does not define precisely. When Vegas cannot reproduce an operation faithfully, returning a plausible-looking approximation can be more dangerous than rejecting it.

For those cases, the Local Runtime prefers an explicit error. Examples can include platform-specific conversions or request options that the local host platform cannot represent faithfully.

## Scope

The Local Runtime is intentionally incremental. API support expands service by service while keeping behavior and limitations explicit.

The source of truth for audited method status is:

```text
scripts/runtime-api-status.json
```

The generated human-readable view is:

```text
docs/guide/runtime-api-coverage.md
```

Both structural coverage and behavior metadata are checked in CI so implementation drift cannot silently change an already audited surface.
