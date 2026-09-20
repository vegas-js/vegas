import { describe, expect, test } from "vitest";

import { ArtifactStore } from "../build";
import { replaceDevBuildArtifacts } from "./build-artifacts";

describe("replaceDevBuildArtifacts", () => {
  test("replace client and server scopes together", () => {
    const store = new ArtifactStore();
    store.replaceScopes([
      {
        scope: "client",
        artifacts: [
          { path: "index.html", content: "client:old" },
          { path: "stale.html", content: "stale" },
        ],
      },
      {
        scope: "server",
        artifacts: [{ path: "Code.js", content: "server:old" }],
      },
    ]);

    replaceDevBuildArtifacts(store, {
      clientArtifacts: [{ path: "index.html", content: "client:new" }],
      serverArtifacts: [{ path: "Code.js", content: "server:new" }],
    });

    expect(store.readText("index.html")).toBe("client:new");
    expect(store.readText("Code.js")).toBe("server:new");
    expect(() => store.readText("stale.html")).toThrow("Artifact not found: stale.html");
  });
});
