---
outline: deep
---

# Command Line Interface

Vegas provides the `vegas` command for local development, production builds, authentication, and pushing build output to Apps Script.

## Commands

| Command                          | Purpose                                                             |
| -------------------------------- | ------------------------------------------------------------------- |
| `vegas [root]`                   | Start the local development server                                  |
| `vegas dev [root]`               | Alias for the default development command                           |
| `vegas serve [root]`             | Alias for the default development command                           |
| `vegas preview [root]`           | Start the local server using the production-mode build pipeline     |
| `vegas build [root]`             | Build production artifacts                                          |
| `vegas auth login <client-file>` | Authenticate with Google for Apps Script                            |
| `vegas push [root]`              | Push the current production build output to the Apps Script project |

## Project Root

The development, preview, build, and push commands accept an optional project root.

```sh
vegas build ./my-project
```

Relative roots are resolved from the current working directory. When both a CLI root and the `root` configuration option are provided, the CLI root takes precedence.

## Development

Running `vegas`, `vegas dev`, or `vegas serve` starts the same development workflow.

```sh
vegas
```

Vegas scans the project, builds the development topology, starts the local web application, and uses the configured local runtime data for supported Apps Script APIs.

## Preview

`vegas preview` starts the local application using the production-mode build pipeline.

```sh
vegas preview
```

Preview is still a local workflow. It does not push or deploy the project to Apps Script.

## Build

`vegas build` creates the production artifacts in the configured output directory.

```sh
vegas build
```

The default output directory is `dist`. Vegas treats production output as authoritative and replaces the existing output directory after a successful build.

## Authentication

`vegas auth login` signs in to Google using a Desktop OAuth client JSON file.

```sh
vegas auth login ./client-secret.json
```

Use `--profile` to store and select a named Apps Script authentication profile:

```sh
vegas auth login ./client-secret.json --profile work
```

Use `--scope` to request additional OAuth scopes. The option may be provided more than once:

```sh
vegas auth login ./client-secret.json \
  --scope https://www.googleapis.com/auth/script.projects \
  --scope https://www.googleapis.com/auth/drive.readonly
```

## Push

`vegas push` uploads the current production build output to the configured Apps Script project.

```sh
vegas push
```

Push does not run a production build first. Build the project before pushing when the output needs to be refreshed:

```sh
vegas build
vegas push
```

Use `--profile` to select a named authentication profile:

```sh
vegas push --profile work
```

The push target is resolved from the project's Apps Script configuration. See [Shared Options](../config/shared-options) for `appsScript.scriptId` and its resolution rules.
