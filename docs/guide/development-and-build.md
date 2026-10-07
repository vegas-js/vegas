---
outline: deep
---

# Development and Build

Vegas uses the same project model and build planning across development, preview, and production builds, but each workflow has a different lifecycle.

| Workflow                            | Build mode  | Local web app | Watches project files | Starts the local runtime | Writes `output.dir` |
| ----------------------------------- | ----------- | ------------- | --------------------- | ------------------------ | ------------------- |
| `vegas`, `vegas dev`, `vegas serve` | development | Yes           | Yes                   | Yes                      | No                  |
| `vegas preview`                     | production  | Yes           | Yes                   | Yes                      | No                  |
| `vegas build`                       | production  | No            | No                    | No                       | Yes                 |

The build mode controls the Vite mode and environment values used while Vegas builds client and server artifacts. It is separate from whether artifacts are written to the production output directory.

## Development

`vegas`, `vegas dev`, and `vegas serve` start the same development workflow.

Vegas resolves and scans the project, creates a development-mode builder, builds the initial client and server artifacts, and keeps those artifacts in memory for the local web application.

While the local application is running, Vegas watches the configured client, server, and runtime-data directories:

- Changes to client or server sources rebuild the affected application artifacts.
- Adding or removing application sources refreshes the build topology.
- Changes to runtime-data sources reload the Local Runtime data.

Client rebuilds and build-topology changes reload the browser when needed.

See [Local Runtime](./local-runtime) for runtime-data lifecycle and supported Apps Script behavior.

## Preview

`vegas preview` uses the same local application lifecycle as development, including project watching and the Local Runtime, but creates the builder in production mode.

This makes preview useful for checking production-mode client and server output through the Vegas local application before creating deployment artifacts.

Preview does **not** read from or write to `output.dir`. Its client and server artifacts are built in memory, so running `vegas preview` does not refresh `dist`.

## Production Build

`vegas build` creates deployment artifacts using production mode without starting the local web application or file watchers.

Vegas first builds the application artifacts in memory. It then adds the generated Apps Script manifest and replaces the configured production output only after artifact generation succeeds.

The default output directory is `dist`. See [Project Structure](./project-structure#production-output) and [Shared Options](../config/shared-options#output) for output configuration and safety rules.

## Typical Workflow

A normal local-to-Apps-Script workflow is:

```sh
vegas
vegas preview
vegas build
vegas push
```

Use development while editing, preview when you want to exercise the local application with production-mode builds, and build when you want to refresh the production output that `vegas push` uploads.

`vegas push` does not run `vegas build` automatically. See [Command Line Interface](./cli#push) for push behavior and authentication options.
