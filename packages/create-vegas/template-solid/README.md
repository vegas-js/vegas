# Vegas + Solid + TypeScript

A minimal Solid and Google Apps Script project created with `create-vegas`.

## Getting Started

```bash
npm install
npm run dev
```

Start editing `src/client/App.tsx`. The Apps Script server entry is `src/server/Code.ts`.

Set `appsScript.scriptId` in `vegas.config.ts` before pushing to Apps Script.

## Scripts

- `npm run dev` — start the local development server
- `npm run build` — type-check and build the project
- `npm run preview` — preview the production build locally
- `npm run login -- <oauth-client-json>` — authenticate with Google for Apps Script
- `npm run push` — build and push the project to Apps Script

## Documentation

- [Vegas](https://vegasjs.dev/)
- [Solid](https://docs.solidjs.com/)
