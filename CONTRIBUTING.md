# Contributing to Vegas

Thanks for contributing to Vegas.

Vegas is still experimental and may make breaking changes while its architecture and public APIs evolve. Please keep changes focused, testable, and consistent with the existing package boundaries.

## Before You Start

- Base new work on the current `main` branch unless a maintainer asks for a different base.
- For large or cross-cutting changes, open an issue first so the intended behavior and architecture can be discussed before implementation.
- Keep unrelated refactors out of feature and bug-fix changes where practical.
- Call out breaking changes explicitly in the pull request description.

## Requirements

The repository currently requires:

- Node.js 22.18.0 or newer.
- pnpm 12.3.4.

Install dependencies from the repository root:

```sh
pnpm install
```

If you are working on Playwright or browser-harness behavior, install the same browser set used by CI:

```sh
pnpm exec playwright install --with-deps --only-shell chromium firefox webkit
```

## Repository Layout

```text
packages/
  vegas/          Core CLI, build system, Local Runtime, testing adapters, and public package APIs
  create-vegas/   Project scaffolding CLI and templates
docs/             VitePress documentation
scripts/          Release checks and generated documentation tooling
```

Within `packages/vegas/src/node`, major subsystems are organized by responsibility, including build, development, authentication, Local Runtime composition, Runtime Data, harnesses, and framework adapters.

When a subsystem exposes an `index.ts` boundary, code outside that subsystem should prefer the boundary instead of importing implementation files directly. Files within the same subsystem may import their sibling modules directly.

Do not bypass dependency boundaries enforced by lint rules. In particular, the Runtime core must remain independent from Node-specific adapters and higher-level orchestration.

## Development Workflow

Keep tests with the implementation they cover.

- TypeScript tests use `*.spec.ts`.
- Integration tests that exercise real local servers or browser infrastructure may use `*.integration.spec.ts`.
- Unit tests should be deterministic and should not depend on live Google services or other external runtime state.
- Prefer dependency injection, fixtures, and the shared Local Runtime / harness infrastructure over hidden global test state.

For behavior changes, add or update tests that demonstrate both the expected behavior and important failure cases.

Format changed files before committing:

```sh
pnpm format
```

Useful repository checks are:

```sh
pnpm lint
pnpm test
pnpm build
pnpm check
pnpm release:smoke
pnpm release:check
```

`pnpm release:check` is the closest local equivalent to the repository CI gate. CI additionally enables the Playwright browser matrix.

## Local Runtime Compatibility

The Local Runtime is a development implementation of selected public Apps Script contracts. It is not intended to copy or reverse engineer undocumented production behavior.

When changing Local Runtime behavior:

1. Prefer Google Apps Script's public documentation and public type declarations such as `@types/google-apps-script`.
2. Use public standards or documented upstream specifications when the Apps Script contract depends on them.
3. Do not probe the production Google Apps Script runtime as a behavioral oracle for undocumented behavior.
4. Keep Vegas-specific emulation, fail-closed behavior, and other intentional local differences explicit in code comments and tests.
5. Preserve the distinction between documented behavior, local emulation, intentional no-ops, and unsupported behavior.

See the [Project Philosophy](https://vegasjs.dev/guide/philosophy) and [Local Runtime](https://vegasjs.dev/guide/local-runtime) documentation for the runtime model.

## Runtime Data and Test Harnesses

Runtime Data is declarative fixture input, not persistence. Changes to Runtime Data behavior should preserve the distinction between fixture-owned state and session-owned runtime state.

Vitest and Playwright share the same underlying Local Runtime and harness infrastructure but have different lifecycle adapters. Avoid introducing common abstractions solely to make the adapters look similar when their ownership or lifecycle semantics differ.

## Generated Files

Some repository files are generated and should be updated through their source tooling.

### Runtime API coverage

`docs/guide/runtime-api-coverage.md` is generated from Runtime implementation and status metadata.

After changing Runtime API coverage, regenerate it with:

```sh
pnpm docs:api-coverage
```

Use this check to verify that the generated file is current:

```sh
pnpm docs:api-coverage:check
```

### Bundled dependency licenses

Package `LICENSE.md` files are generated during the build from bundled dependencies and their legal files.

After changing bundled dependencies or bundling configuration, run:

```sh
pnpm build
```

Review and commit any resulting `LICENSE.md` changes. `pnpm license:check` verifies that a build does not leave uncommitted generated license changes.

## Documentation and Changelogs

Update documentation when a change affects user-facing configuration, commands, project structure, Runtime behavior, or public APIs.

For user-visible package changes, update the appropriate `Unreleased` section:

- `packages/vegas/CHANGELOG.md`
- `packages/create-vegas/CHANGELOG.md`

Do not manually edit generated Runtime API coverage in place; change its source data or implementation and regenerate it instead.

## Pull Requests

A pull request should explain:

- What changed.
- Why the change is needed.
- How it was tested.
- Whether it introduces a breaking change.
- Whether documentation or changelog entries were updated when relevant.

Before requesting review, run the checks appropriate to the change. For changes that can affect packaging, generated output, templates, or release behavior, run the full:

```sh
pnpm release:check
```

## Commit Messages

Use short, descriptive commit messages. The repository generally uses conventional-style prefixes such as:

```text
feat: ...
fix: ...
refactor: ...
docs: ...
test: ...
chore: ...
```

Keep each commit focused enough that its purpose is clear from the message and diff.
