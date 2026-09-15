import { describe, expect, test } from "vitest";

import { createAppsScriptProjectContent } from "./content";

describe("createAppsScriptProjectContent", () => {
  test("create Apps Script project content from build artifacts", () => {
    expect(
      createAppsScriptProjectContent([
        {
          path: "pages/dashboard.html",
          content: "<h1>Dashboard</h1>",
        },
        {
          path: "Code.js",
          content: "function doGet() {}",
        },
        {
          path: "appsscript.json",
          content: '{"timeZone":"UTC"}',
        },
      ]),
    ).toStrictEqual({
      files: [
        {
          name: "Code",
          type: "SERVER_JS",
          source: "function doGet() {}",
        },
        {
          name: "appsscript",
          type: "JSON",
          source: '{"timeZone":"UTC"}',
        },
        {
          name: "pages/dashboard",
          type: "HTML",
          source: "<h1>Dashboard</h1>",
        },
      ],
    });
  });

  test("normalize logical path separators", () => {
    expect(
      createAppsScriptProjectContent([
        {
          path: "appsscript.json",
          content: "{}",
        },
        {
          path: "pages\\dashboard.html",
          content: "dashboard",
        },
      ]),
    ).toStrictEqual({
      files: [
        {
          name: "appsscript",
          type: "JSON",
          source: "{}",
        },
        {
          name: "pages/dashboard",
          type: "HTML",
          source: "dashboard",
        },
      ],
    });
  });

  test("reject binary artifact", () => {
    expect(() =>
      createAppsScriptProjectContent([
        {
          path: "appsscript.json",
          content: "{}",
        },
        {
          path: "binary.js",
          content: new Uint8Array([0xff]),
        },
      ]),
    ).toThrow("Push artifact must be text: binary.js");
  });

  test("reject unsupported artifact", () => {
    expect(() =>
      createAppsScriptProjectContent([
        {
          path: "appsscript.json",
          content: "{}",
        },
        {
          path: "style.css",
          content: "body {}",
        },
      ]),
    ).toThrow("Unsupported push artifact: style.css");
  });

  test("require Apps Script manifest", () => {
    expect(() =>
      createAppsScriptProjectContent([
        {
          path: "Code.js",
          content: "function hello() {}",
        },
      ]),
    ).toThrow("Apps Script manifest not found: appsscript.json");
  });

  test("reject invalid Apps Script manifest", () => {
    expect(() =>
      createAppsScriptProjectContent([
        {
          path: "appsscript.json",
          content: "{ invalid",
        },
      ]),
    ).toThrow("Invalid Apps Script manifest: appsscript.json");
  });

  test("reject duplicate project file", () => {
    expect(() =>
      createAppsScriptProjectContent([
        {
          path: "appsscript.json",
          content: "{}",
        },
        {
          path: "Code.js",
          content: "first",
        },
        {
          path: "./Code.js",
          content: "second",
        },
      ]),
    ).toThrow("Duplicate Apps Script project file: Code");
  });

  test("reject artifact path outside logical root", () => {
    expect(() =>
      createAppsScriptProjectContent([
        {
          path: "appsscript.json",
          content: "{}",
        },
        {
          path: "../Code.js",
          content: "function hello() {}",
        },
      ]),
    ).toThrow("Invalid push artifact path: ../Code.js");
  });

  test("reject absolute artifact path", () => {
    expect(() =>
      createAppsScriptProjectContent([
        {
          path: "appsscript.json",
          content: "{}",
        },
        {
          path: "C:\\project\\Code.js",
          content: "function hello() {}",
        },
      ]),
    ).toThrow("Invalid push artifact path: C:\\project\\Code.js");
  });
});
