# Unreleased

- Refactored the build and development architecture around explicit project, build plan, artifact, execution, session, and application boundaries.
- Improved development and preview correctness for HTTP handling, host HTML serialization, session binding, protocol failures, build failures, inline HTML, and build topology.
- Added native Google Apps Script authentication and push workflows using the Apps Script API.
- Added Apps Script project and manifest configuration, including script ID resolution and strict configuration validation.
- Added explicit public package surfaces for configuration, client server-function calls, and Apps Script server types.
- Improved CLI diagnostics and failure messages for configuration, authentication, push prerequisites, and Google service errors.
- Hardened package validation, release smoke testing, CI, and tag-driven npm publishing.
- Updated project layout defaults for SPA and script-only applications.
- Renamed local runtime source data configuration from `gasMockDir` to `runtimeDataDir`, with `runtime/` as the default directory.
- Updated documentation and project metadata to reflect current SPA, script-only, and partial local runtime capabilities.

# 0.1.9 (2026-06-30)

chore: upgrade dependencies

# 0.1.8 (2026-06-09)

chore: upgrade dependencies

# 0.1.7 (2026-05-12)

feature: support console
feature: support Logger
feature: add html template
fix: add remove gas run object with error
chore: improve sanitize html
chore: upgrade dependencies
wip: add doPost handle

# 0.1.6 (2026-04-09)

feat: vegs push.
fix: screen does not display during Full-Bundle Refresh.
fix: garbled characters on serve.
chore: improve handler flow.
chore: improve webapp detection.
chore: improve fallback condition.
chore: refactoring inner plugins.
chore: upgrade dependencies.

# 0.1.5 (2026-04-01)

chore: improve README.

# 0.1.4 (2026-04-01)

feat: support svelte.
feat: support GAS script only build.
feat: add preview subcommand.
feat: support no config file.
chore: improve Logger API.
chore: add Logger API tests.
chore: add Session API tests.
chore: add genarateManifest tests.
chore: improve error handling.
chore: rename frontend dir (web -> client).
chore: disable codeSplitting.
chore: improve rolldownLicensePlugin.

# 0.1.3 (2026-03-22)

feat: add Spreadsheet#getCell().
feat: add Spreadsheet#clearContents().
feat: add Sheet#clearContents().
chore: modified to work without a configuration file.
chore: improve Utilities#formatDate().
chore: parallel request UrlFetchApp#fechAll.

# 0.1.2 (2026-03-17)

feat: supports import aliases using tsconfig's paths.
feat: add Spreadsheet#getSheetById().
feat: add Sheet#getLastColumn().
feat: add Sheet#getLastRow().
feat: add Sheet#getMaxColumns().
feat: add Sheet#getMaxRows().
feat: add Sheet#getSheetId().
feat: add Sheet#getSheetName().
feat: add Sheet#getSheetValues().
feat: add Sheet#getRange().
feat: add Range#getValue().
feat: add Range#getValues().
feat: add Range#setValue().
feat: add Range#setValues().
fix: remove the default SSR environment settings from the build process.
chore: auto generation of full bundle licenses.
chore: add README.

# 0.1.1 (2026-03-14)

fix: an error occurs even though a Code.ts file exists, when the client has not been created.

# 0.1.0 (2026-03-14)

Initial release.
