import { describe, expect, test } from "vitest";

import { extractReleaseNotes } from "./release-notes.js";

describe("release notes", () => {
  test("extracts the requested versioned changelog section", () => {
    expect(
      extractReleaseNotes(
        `# Changelog

## Unreleased

- Future change.

## 0.2.0 - 2026-10-08

### Added

- Added a feature.

### Changed

- Changed behavior.

## 0.1.9 - 2026-06-30

- Previous release.
`,
        "0.2.0",
      ),
    ).toBe(`### Added

- Added a feature.

### Changed

- Changed behavior.`);
  });

  test("does not use Unreleased notes for a release", () => {
    expect(() =>
      extractReleaseNotes(
        `# Changelog

## Unreleased

- Future change.
`,
        "0.2.0",
      ),
    ).toThrow("Missing release section for version 0.2.0");
  });

  test("requires a dated release heading", () => {
    expect(() =>
      extractReleaseNotes(
        `# Changelog

## 0.2.0

- Release notes.
`,
        "0.2.0",
      ),
    ).toThrow("Missing release section for version 0.2.0");
  });

  test("rejects duplicate versioned release sections", () => {
    expect(() =>
      extractReleaseNotes(
        `# Changelog

## 0.2.0 - 2026-10-08

- First.

## 0.2.0 - 2026-10-09

- Second.
`,
        "0.2.0",
      ),
    ).toThrow("Duplicate release sections for version 0.2.0");
  });

  test("rejects an empty release section", () => {
    expect(() =>
      extractReleaseNotes(
        `# Changelog

## 0.2.0 - 2026-10-08

## 0.1.9 - 2026-06-30

- Previous release.
`,
        "0.2.0",
      ),
    ).toThrow("Empty release section for version 0.2.0");
  });
});
