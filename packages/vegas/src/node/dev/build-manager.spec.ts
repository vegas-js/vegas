import path from "node:path";

import type { ViteBuilder } from "vite";
import { describe, expect, test, vi } from "vitest";

import { ArtifactStore, type BuildArtifact } from "../build";
import type { ResolvedProject } from "../project";
import { DevBuildManager } from "./build-manager";

const fsRoot = path.parse(process.cwd()).root;
const root = path.join(fsRoot, "home", "user", "project");

function createProject(): ResolvedProject {
  return {
    root,
    configFile: null,
    clientDir: path.join(root, "src", "client"),
    serverDir: path.join(root, "src", "server"),
    runtimeDataDir: path.join(root, "runtime"),
    outputDir: path.join(root, "dist"),
    appType: "spa",
    plugins: [],
    devServer: { open: false },
    appsScript: {
      manifest: {
        exceptionLogging: "STACKDRIVER",
        runtimeVersion: "V8",
        timeZone: "UTC",
        webapp: {
          access: "MYSELF",
          executeAs: "USER_ACCESSING",
        },
      },
    },
  };
}

function createArtifacts() {
  const artifacts = new ArtifactStore();
  artifacts.replaceScopes([
    {
      scope: "client",
      artifacts: [{ path: "index.html", content: "client:old" }],
    },
    {
      scope: "server",
      artifacts: [{ path: "Code.js", content: "server:old" }],
    },
  ]);
  return artifacts;
}

describe("DevBuildManager", () => {
  test("rebuild client and server artifacts for client changes", async () => {
    const builder = {} as ViteBuilder;
    const artifacts = createArtifacts();

    const build = vi.fn(
      async (_builder: ViteBuilder, filter?: RegExp): Promise<BuildArtifact[]> => {
        if (String(filter) === "/^client(?:\\d+|Html\\d+)$/") {
          return [{ path: "index.html", content: "client:new" }];
        }

        return [{ path: "Code.js", content: "server:new" }];
      },
    );

    const manager = new DevBuildManager(
      {
        project: createProject(),
        artifacts,
        builder,
        mode: "development",
      },
      {
        buildApp: build,
      },
    );

    await manager.rebuild("client");

    expect(build).toHaveBeenCalledTimes(2);
    expect(artifacts.readText("index.html")).toBe("client:new");
    expect(artifacts.readText("Code.js")).toBe("server:new");
  });

  test("rebuild only server artifacts for server changes", async () => {
    const artifacts = createArtifacts();
    const build = vi.fn(async (): Promise<BuildArtifact[]> => {
      return [{ path: "Code.js", content: "server:new" }];
    });

    const manager = new DevBuildManager(
      {
        project: createProject(),
        artifacts,
        builder: {} as ViteBuilder,
        mode: "development",
      },
      {
        buildApp: build,
      },
    );

    await manager.rebuild("server");

    expect(build).toHaveBeenCalledTimes(1);
    expect(artifacts.readText("index.html")).toBe("client:old");
    expect(artifacts.readText("Code.js")).toBe("server:new");
  });

  test("replace the current builder and artifacts when topology changes", async () => {
    const initialBuilder = {} as ViteBuilder;
    const nextBuilder = {} as ViteBuilder;
    const artifacts = createArtifacts();

    const build = vi.fn(async (builder: ViteBuilder): Promise<BuildArtifact[]> => {
      expect(builder).toBe(nextBuilder);
      return [{ path: "Code.js", content: "server:rebuilt" }];
    });

    const manager = new DevBuildManager(
      {
        project: createProject(),
        artifacts,
        builder: initialBuilder,
        mode: "development",
      },
      {
        buildApp: build,
        buildDevTopology: async () => ({
          snapshot: {
            clientSources: [],
            serverSources: [],
            runtimeDataSources: [],
            clientModuleEntries: [],
            clientHtmlEntries: [],
          },
          builder: nextBuilder,
          clientArtifacts: [{ path: "index.html", content: "client:topology" }],
          serverArtifacts: [{ path: "Code.js", content: "server:topology" }],
        }),
      },
    );

    await manager.refreshTopology();

    expect(artifacts.readText("index.html")).toBe("client:topology");
    expect(artifacts.readText("Code.js")).toBe("server:topology");

    await manager.rebuild("server");

    expect(build).toHaveBeenCalledTimes(1);
    expect(artifacts.readText("Code.js")).toBe("server:rebuilt");
  });
  test("keep the previous topology when artifact replacement fails", async () => {
    const initialBuilder = {} as ViteBuilder;
    const nextBuilder = {} as ViteBuilder;
    const artifacts = createArtifacts();

    const build = vi.fn(async (builder: ViteBuilder): Promise<BuildArtifact[]> => {
      expect(builder).toBe(initialBuilder);
      return [{ path: "Code.js", content: "server:rebuilt" }];
    });

    const manager = new DevBuildManager(
      {
        project: createProject(),
        artifacts,
        builder: initialBuilder,
        mode: "development",
      },
      {
        buildApp: build,
        buildDevTopology: async () => ({
          snapshot: {
            clientSources: [],
            serverSources: [],
            runtimeDataSources: [],
            clientModuleEntries: [],
            clientHtmlEntries: [],
          },
          builder: nextBuilder,
          clientArtifacts: [{ path: "shared.html", content: "client:new" }],
          serverArtifacts: [{ path: "shared.html", content: "server:new" }],
        }),
      },
    );

    await expect(manager.refreshTopology()).rejects.toThrow(
      'Artifact "shared.html" already belongs to scope "client".',
    );

    expect(artifacts.readText("index.html")).toBe("client:old");
    expect(artifacts.readText("Code.js")).toBe("server:old");
    expect(() => artifacts.readText("shared.html")).toThrow("Artifact not found: shared.html");

    await manager.rebuild("server");

    expect(build).toHaveBeenCalledTimes(1);
    expect(artifacts.readText("Code.js")).toBe("server:rebuilt");
  });
});
