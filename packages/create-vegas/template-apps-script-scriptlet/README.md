# Vegas + Apps Script Scriptlets + TypeScript

A minimal Google Apps Script HTML template project created with `create-vegas`.

## Getting Started

```bash
npm install
npm run dev
```

Start editing `src/client/index.html`. Client behavior is in `src/client/client.ts`, and the Apps Script server entry is `src/server/Code.ts`.

Set `appsScript.scriptId` in `vegas.config.ts` before pushing to Apps Script.

## Typed Server Calls (Optional)

This starter keeps the server entry focused on `doGet()`. To call server methods
from client code, define a shared contract in `src/contracts/rpc.ts`, export a
plain `rpc` registry using `defineServerFunctions<Contract>()` from
`@vegasjs/vegas/server` in `src/server/Code.ts`, and call it using
`createRpcClient<Contract>()` from `@vegasjs/vegas/client`. Keep `doGet()` as a
separate top-level export.

See the [registered RPC guide](https://vegasjs.dev/guide/api-javascript) for
complete examples. Registered RPC requires `@vegasjs/vegas` v0.3.0 or later.

## Apps Script Templates

`src/client/index.html` can use Apps Script scriptlets such as `<? ... ?>` and `<?= ... ?>`.

`src/server/Code.ts` creates the template with `HtmlService.createTemplateFromFile(...)`, assigns template values, and calls `evaluate()` before returning the HTML output.

## Scripts

- `npm run dev` — start the local development server
- `npm run build` — type-check and build the project
- `npm run preview` — preview the production build locally
- `npm run login -- <oauth-client-json>` — authenticate with Google for Apps Script
- `npm run push` — build and push the project to Apps Script

## Documentation

- [Vegas](https://vegasjs.dev/)
- [Apps Script HTML templates](https://developers.google.com/apps-script/guides/html/templates)
