import { describe, expect, test } from "vitest";

import { ArtifactStore } from "../build";
import { createRuntimeProgram } from "./runtime-program";

describe("createRuntimeProgram", () => {
  test("create a snapshot from the current server artifact", () => {
    const artifacts = new ArtifactStore();

    artifacts.replaceScope("server", [
      {
        path: "Code.js",
        content: "first",
      },
    ]);

    const first = createRuntimeProgram(artifacts);

    artifacts.replaceScope("server", [
      {
        path: "Code.js",
        content: "second",
      },
    ]);

    expect(first).toStrictEqual({
      source: "first",
      htmlFiles: {},
    });
    expect(createRuntimeProgram(artifacts)).toStrictEqual({
      source: "second",
      htmlFiles: {},
    });
  });

  test("create a snapshot from current client HTML artifacts", () => {
    const artifacts = new ArtifactStore();

    artifacts.replaceScopes([
      {
        scope: "client",
        artifacts: [
          {
            path: "index.html",
            content: "index:first",
          },
          {
            path: "admin.html",
            content: "admin:first",
          },
          {
            path: "assets/app.js",
            content: "client:first",
          },
        ],
      },
      {
        scope: "server",
        artifacts: [
          {
            path: "Code.js",
            content: "server",
          },
        ],
      },
    ]);

    const first = createRuntimeProgram(artifacts);

    artifacts.replaceScope("client", [
      {
        path: "index.html",
        content: "index:second",
      },
      {
        path: "assets/app.js",
        content: "client:second",
      },
    ]);

    expect(first.htmlFiles).toStrictEqual({
      "index.html": "index:first",
      "admin.html": "admin:first",
    });
    expect(createRuntimeProgram(artifacts).htmlFiles).toStrictEqual({
      "index.html": "index:second",
    });
  });
});
