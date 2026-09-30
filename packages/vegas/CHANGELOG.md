# Changelog

## Unreleased

### Added

- Added native Google Apps Script authentication and push workflows using the Apps Script API.
- Added Apps Script project and manifest configuration, including script ID resolution and strict configuration validation.
- Added configurable Google Apps Script server-function execution with OAuth scope requirements.
- Added explicit public package surfaces for configuration, client server-function calls, Apps Script server types, Vitest integration, and Playwright integration.
- Added Local Runtime data fixtures with validation, reset and reconciliation semantics, reusable runtime/browser harnesses, and local Spreadsheet support.
- Added a typed Spreadsheet data layer with schemas, query plans, storage layouts, repositories, row codecs, and mutation guards.

### Changed

- Refactored the build and development architecture around explicit project, build plan, artifact, execution, session, and application boundaries.
- Improved development and preview correctness for HTTP handling, host HTML serialization, session binding, protocol failures, build failures, inline HTML, and build topology.
- Improved CLI diagnostics and failure messages for configuration, authentication, push prerequisites, and Google service errors.
- Hardened package validation, release smoke testing, CI, and tag-driven npm publishing.
- Updated project layout defaults for SPA and script-only applications.
- Renamed Local Runtime source data configuration from `gasMockDir` to `runtimeDataDir`, with `runtime/` as the default directory.
- Updated documentation and project metadata to reflect the current SPA, script-only, Local Runtime, Vitest, and Playwright capabilities.
- Hardened production output cleanup with explicit opt-in for output directories outside the project root and preservation of existing output when builds fail.

## 0.1.9 - 2026-06-30

- Upgraded dependencies.

## 0.1.8 - 2026-06-09

- Upgraded dependencies.

## 0.1.7 - 2026-05-12

- Added console support.
- Added `Logger` support.
- Added HTML template support.
- Fixed GAS run object removal on error.
- Improved HTML sanitization.
- Upgraded dependencies.
- Added initial `doPost` handling.

## 0.1.6 - 2026-04-09

- Added Vegas push support.
- Fixed a blank screen during Full-Bundle Refresh.
- Fixed garbled characters when serving applications.
- Improved handler flow.
- Improved web app detection.
- Improved fallback conditions.
- Refactored internal plugins.
- Upgraded dependencies.

## 0.1.5 - 2026-04-01

- Improved the README.

## 0.1.4 - 2026-04-01

- Added Svelte support.
- Added Google Apps Script script-only builds.
- Added the `preview` subcommand.
- Added support for projects without a configuration file.
- Improved the `Logger` API.
- Added `Logger` API tests.
- Added `Session` API tests.
- Added `generateManifest` tests.
- Improved error handling.
- Renamed the frontend directory from `web` to `client`.
- Disabled code splitting.
- Improved `rolldownLicensePlugin`.

## 0.1.3 - 2026-03-22

- Added `Spreadsheet#getCell()`.
- Added `Spreadsheet#clearContents()`.
- Added `Sheet#clearContents()`.
- Improved support for projects without a configuration file.
- Improved `Utilities#formatDate()`.
- Parallelized `UrlFetchApp#fetchAll()` requests.

## 0.1.2 - 2026-03-17

- Added import alias support using `tsconfig` paths.
- Added `Spreadsheet#getSheetById()`.
- Added `Sheet#getLastColumn()`.
- Added `Sheet#getLastRow()`.
- Added `Sheet#getMaxColumns()`.
- Added `Sheet#getMaxRows()`.
- Added `Sheet#getSheetId()`.
- Added `Sheet#getSheetName()`.
- Added `Sheet#getSheetValues()`.
- Added `Sheet#getRange()`.
- Added `Range#getValue()`.
- Added `Range#getValues()`.
- Added `Range#setValue()`.
- Added `Range#setValues()`.
- Removed the default SSR environment settings from the build process.
- Added automatic generation of full-bundle licenses.
- Added the README.

## 0.1.1 - 2026-03-14

- Fixed an error when `Code.ts` exists but no client has been created.

## 0.1.0 - 2026-03-14

- Initial release.
