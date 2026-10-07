import { describe, expect, test } from "vitest";

import type { BuildArtifact } from "../artifact";
import { isWebApp } from "./webapp";

describe("isWebApp", () => {
  test("return false when Code.js does not exist", () => {
    const artifacts: BuildArtifact[] = [
      {
        path: "index.html",
        content: "<html></html>",
      },
    ];

    expect(isWebApp(artifacts)).toBe(false);
  });

  test("return false when Code.js has no web app entry", () => {
    const artifacts: BuildArtifact[] = [
      {
        path: "Code.js",
        content: `
          function main() {
            return "hello";
          }
        `,
      },
    ];

    expect(isWebApp(artifacts)).toBe(false);
  });

  test("return true when Code.js declares doGet", () => {
    const artifacts: BuildArtifact[] = [
      {
        path: "Code.js",
        content: `
          function doGet() {
            return "hello";
          }
        `,
      },
    ];

    expect(isWebApp(artifacts)).toBe(true);
  });

  test("return true when Code.js declares doPost", () => {
    const artifacts: BuildArtifact[] = [
      {
        path: "Code.js",
        content: `
          function doPost() {
            return "hello";
          }
        `,
      },
    ];

    expect(isWebApp(artifacts)).toBe(true);
  });
});
