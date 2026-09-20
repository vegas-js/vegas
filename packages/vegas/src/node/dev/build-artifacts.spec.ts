import type { ViteBuilder } from "vite";
import { describe, expect, test, vi } from "vitest";

import { ArtifactStore, type BuildArtifact } from "../build";
import { buildDevArtifacts, replaceDevBuildArtifacts } from "./build-artifacts";

describe("buildDevArtifacts", () => {
  test("build client and server artifacts in parallel scopes", async () => {
    const builder = {} as ViteBuilder;
    const build = vi.fn(
      async (_builder: ViteBuilder, filter?: RegExp): Promise<BuildArtifact[]> => {
        if (String(filter) === "/^client\\d+$/") {
          return [{ path: "index.html", content: "client" }];
        }

        return [{ path: "Code.js", content: "server" }];
      },
    );

    await expect(buildDevArtifacts(builder, build)).resolves.toStrictEqual({
      clientArtifacts: [{ path: "index.html", content: "client" }],
      serverArtifacts: [{ path: "Code.js", content: "server" }],
    });
    expect(build).toHaveBeenNthCalledWith(1, builder, /^client\d+$/);
    expect(build).toHaveBeenNthCalledWith(2, builder, /^server$/);
  });
});

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
