---
outline: deep
---

# Local Runtime

Vegas includes a local Apps Script-oriented runtime to shorten the development feedback loop. It models selected Apps Script APIs closely enough for supported server-side code to participate in local development and preview workflows.

The Local Runtime is **not** a copy of the Google Apps Script production runtime and is not intended to reproduce undocumented Google behavior.

See [Runtime Architecture](./runtime-architecture) for how Local Runtime execution relates to the optional Google Apps Script server-function backend.

## How to Use It

Use the Local Runtime for fast feedback while developing code that uses APIs Vegas currently models. Treat deployed Google Apps Script as a separate execution environment whose behavior is governed by Google's public platform contract.

Development and preview both use the same Local Runtime lifecycle. The current API inventory and structural coverage are listed in [Runtime API coverage](./runtime-api-coverage).

## Runtime Data

Runtime data provides declarative seed data for the Local Runtime. Vegas scans TypeScript files under `runtimeDataDir`, which defaults to `runtime` at the project root.

Each runtime-data file must have a default export with one target. The currently supported targets are:

- `"Properties"`
- `"Session"`
- `"Spreadsheet"`

`"Cache"` is reserved for a future runtime-data model and currently fails closed instead of being silently ignored.

Runtime-data files are **fixtures, not persistence**. Mutations made while server code executes affect the current Local Runtime session, but Vegas does not write those mutations back to the source files.

### Properties

A Properties fixture seeds the local script, user, and document property namespaces.

```typescript
export default {
  target: "Properties",
  scriptProperties: {
    API_BASE_URL: "http://localhost:3000",
  },
  userProperties: {
    theme: "dark",
  },
};
```

A runtime-data snapshot can contain at most one Properties fixture.

### Session

A Session fixture supplies the local invocation identity and locale information used by supported Session APIs.

```typescript
export default {
  target: "Session",
  activeUserEmail: "developer@example.com",
  activeUserLocale: "en",
  effectiveUserEmail: "developer@example.com",
  temporaryActiveUserKey: "local-user",
};
```

A runtime-data snapshot can contain at most one Session fixture.

### Spreadsheet

Each Spreadsheet fixture defines one local spreadsheet. Multiple Spreadsheet fixture files can be used in the same project.

```typescript
export default {
  target: "Spreadsheet",
  id: "budget",
  name: "Budget",
  sheets: [
    {
      id: 0,
      name: "Sheet1",
      maxRows: 20,
      maxColumns: 10,
      values: [
        ["Item", "Amount"],
        ["Hosting", 25],
      ],
    },
  ],
};
```

Spreadsheet IDs and explicit URLs must be unique across the snapshot. Sheet IDs and names must be unique within each spreadsheet. Fixture values must fit inside the declared grid and form a rectangular matrix.

## Session Lifetime

A Local Runtime session owns the mutable local stores used while the application is running. The current session contains stores for Cache, Drive, Drive iterators, Lock, Properties, and Spreadsheet state.

When development or preview starts, Vegas creates a fresh session. Properties and Spreadsheet fixtures seed their corresponding stores, while Session fixture data becomes part of the invocation environment.

This distinction matters because a fixture describes initial or replacement data, while a session owns mutable runtime state. A runtime-data source file is therefore not the backing store for an Apps Script service.

## Runtime Data Reloads

Vegas watches the runtime-data directory during development and preview. Adding, changing, or removing a runtime-data source causes Vegas to load and validate a new snapshot and reconcile it with the current session.

Reload is granular:

- An unchanged Properties fixture keeps the current Properties store state. When the Properties fixture changes, the fixture-backed property namespaces are replaced from the new fixture.
- A changed or removed Spreadsheet fixture replaces or removes that fixture-owned spreadsheet.
- Unchanged Spreadsheet state is retained.
- Spreadsheets created by server code are session-owned runtime resources and are not removed by unrelated fixture reloads.
- Cache, Drive, Drive iterator, and Lock stores remain session-owned across runtime-data reloads.
- Session fixture changes are reflected in the invocation environment of the replacement runtime.

Spreadsheet fixture ownership is explicit. A fixture cannot silently replace a spreadsheet that was created by the running Local Runtime with the same ID; that conflict fails instead.

### Transactional Replacement

A runtime-data reload is prepared before it becomes active. Vegas loads and validates the next snapshot, reconciles cloned fixture-backed stores, creates the next Local Runtime, and only then replaces the runtime used for new invocations.

If loading, validation, reconciliation, or runtime creation fails, the current runtime remains active instead of being partially updated.

An invocation that has already been dispatched continues against the runtime that accepted it. Invocations dispatched after a successful replacement use the new runtime.

## Local Spreadsheet Viewer

When `vegas` or `vegas preview` is running, Local Runtime spreadsheets can be opened in a browser-based viewer served by the Vegas local application. For a local Spreadsheet resource, `Spreadsheet.getUrl()` returns the local viewer URL instead of a Google Sheets URL.

This is a Vegas-specific local capability: the viewer URL exists only while the local server is running.

The viewer provides:

- Sheet tabs for switching between local sheets.
- An editable grid that shows at least 20 rows and 10 columns when the Sheet is large enough, while expanding to include populated cells and never exceeding the Sheet's declared bounds.
- Keyboard navigation with the arrow keys and `Tab` / `Shift+Tab`.
- Editing by typing, pressing `Enter` or `F2`, or double-clicking a cell.
- Commit with `Enter`, `Tab`, or focus loss; cancel with `Escape`; clear with `Delete` or `Backspace`.

Cell text is converted using the viewer's local input rules:

- `true` and `false`, ignoring case, become booleans.
- Finite numeric text becomes a number.
- A leading apostrophe forces the remaining text to stay a string.
- Date cells are displayed read-only in the viewer.

Viewer edits update the same current-session Spreadsheet store used by Local Runtime server code. They do not modify runtime-data source files. If a corresponding Spreadsheet fixture later changes, the normal fixture-reload rules described above apply.

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
2. **Enum surface coverage** — which enum surfaces are present, combining enum properties exposed by Global Objects and standalone Global enums.
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

Both structural coverage and behavior metadata are checked in CI. Every explicitly mapped Runtime surface must have a status entry, and every public method on that surface must be audited, so new surfaces or methods cannot silently bypass behavior classification.
