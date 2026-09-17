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
    });
    expect(createRuntimeProgram(artifacts)).toStrictEqual({
      source: "second",
    });
  });
});
