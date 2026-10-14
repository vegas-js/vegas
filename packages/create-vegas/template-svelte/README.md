# Vegas + Svelte + TypeScript

A minimal Svelte and Google Apps Script project created with `create-vegas`.

## Getting Started

```bash
npm install
npm run dev
```

Start editing `src/client/App.svelte`. The Apps Script server entry is `src/server/Code.ts`.

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

## Scripts

- `npm run dev` — start the local development server
- `npm run build` — build the project
- `npm run check` — type-check the Svelte, server, and Vegas config sources
- `npm run preview` — preview the production build locally
- `npm run login -- <oauth-client-json>` — authenticate with Google for Apps Script
- `npm run push` — build and push the project to Apps Script

## Documentation

- [Vegas](https://vegasjs.dev/)
- [Svelte](https://svelte.dev/docs/svelte/overview)
