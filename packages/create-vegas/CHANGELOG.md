# Changelog

## Unreleased

### Added

- Added safer scaffold target handling for missing, empty, non-empty, and invalid destination directories.
- Added package name validation before scaffolding.
- Added smoke coverage across all eight registered project templates.
- Added package and release smoke validation.

### Changed

- Extracted project scaffolding into an explicit execution flow with safer special-file finalization.
- Improved top-level CLI failure handling and diagnostics.
- Updated generated project layouts to match the current Vegas SPA conventions.
- Updated generated projects to depend on `@vegasjs/vegas` ^0.2.0.

## 0.1.8 - 2026-06-30

- Upgraded dependencies.

## 0.1.7 - 2026-06-09

- Upgraded dependencies.

## 0.1.6 - 2026-05-12

- Upgraded dependencies.

## 0.1.5 - 2026-04-09

- Added strict type separation between client and server.
- Upgraded dependencies.

## 0.1.4 - 2026-04-01

- Fixed unpublished templates.

## 0.1.3 - 2026-04-01

- Added the Solid template.
- Added the Svelte template.
- Fixed the `LICENSE-TEMPLATES` command name.
- Improved template npm scripts.
- Upgraded template dependency versions.
- Renamed the frontend directory from `web` to `client`.

## 0.1.2 - 2026-03-22

- Improved the React and Vue templates.
- Added the Vanilla and Preact templates.
- Waived copyright for the templates.
- Improved the scaffolding prompt.
- Removed `template-react-oxc`.

## 0.1.1 - 2026-03-17

- Fixed npm commands to accept stdio.
- Reverted the template package version to `0.0.0`.
- Added automatic generation of full-bundle licenses.
- Added the README.

## 0.1.0 - 2026-03-14

- Initial release.
