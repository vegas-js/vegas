import path from "node:path";

import type { ViteBuilder } from "vite";
import { describe, expect, test, vi } from "vitest";

import { startDevApplication } from "../../dev/application";
import { buildDevTopology } from "../../dev/build-topology";
import { ReloadableLocalRuntime } from "../../dev/reloadable-local-runtime";
import { createRuntimeProgram } from "../../dev/runtime-program";
import { loadProject, scanRuntimeDataSources, type ResolvedProject } from "../../project";
import { InMemorySpreadsheetStore, type LocalRuntime, type Program } from "../../runtime";
import { runDevApplication } from "./dev-application";
import { createLocalRuntime } from "./local-runtime";

vi.mock("../../dev/application", () => ({
  startDevApplication: vi.fn(),
}));

vi.mock("../../dev/build-topology", () => ({
  buildDevTopology: vi.fn(),
}));

vi.mock("../../dev/runtime-program", () => ({
  createRuntimeProgram: vi.fn(),
}));

vi.mock("../../project", () => ({
  loadProject: vi.fn(),
  scanRuntimeDataSources: vi.fn(),
}));

vi.mock("./local-runtime", () => ({
  createLocalRuntime: vi.fn(),
}));

const startDevApplicationMock = vi.mocked(startDevApplication);
const buildDevTopologyMock = vi.mocked(buildDevTopology);
const createRuntimeProgramMock = vi.mocked(createRuntimeProgram);
const loadProjectMock = vi.mocked(loadProject);
const scanRuntimeDataSourcesMock = vi.mocked(scanRuntimeDataSources);
const createLocalRuntimeMock = vi.mocked(createLocalRuntime);

function createProject(): ResolvedProject {
  const root = path.resolve("/workspace/project");

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

function createRuntime(label: string): LocalRuntime {
  return {
    backend: {
      execute: vi.fn(async () => label),
    },
    resources: {
      spreadsheets: new InMemorySpreadsheetStore([
        {
          id: label,
          name: label,
          sheets: [],
        },
      ]),
    },
  };
}

describe("runDevApplication", () => {
  test("compose and reload the local dev application", async () => {
    const project = createProject();
    const builder = {} as ViteBuilder;
    const initialRuntime = createRuntime("initial");
    const reloadedRuntime = createRuntime("reloaded");
    const program = {
      source: "server-program",
      htmlFiles: {
        "index.html": "client-program",
      },
    } satisfies Program;

    loadProjectMock.mockResolvedValueOnce(project);
    buildDevTopologyMock.mockResolvedValueOnce({
      snapshot: {
        clientSources: [],
        serverSources: [],
        runtimeDataSources: ["runtime/initial.ts"],
        clientModuleEntries: [],
        clientHtmlEntries: [],
      },
      builder,
      clientArtifacts: [
        {
          path: "index.html",
          content: "client-artifact",
        },
      ],
      serverArtifacts: [
        {
          path: "Code.js",
          content: "server-artifact",
        },
      ],
    });
    createRuntimeProgramMock.mockReturnValue(program);
    createLocalRuntimeMock
      .mockResolvedValueOnce(initialRuntime)
      .mockResolvedValueOnce(reloadedRuntime);
    scanRuntimeDataSourcesMock.mockResolvedValueOnce(["runtime/reloaded.ts"]);
    startDevApplicationMock.mockResolvedValueOnce(undefined);

    await runDevApplication("production", "custom-root");

    expect(loadProjectMock).toHaveBeenCalledWith({
      cwd: process.cwd(),
      root: "custom-root",
    });
    expect(buildDevTopologyMock).toHaveBeenCalledWith(project, "production");
    expect(startDevApplicationMock).toHaveBeenCalledOnce();

    const [application] = startDevApplicationMock.mock.calls[0];
    const getProgram = createLocalRuntimeMock.mock.calls[0][2];

    expect(application.project).toBe(project);
    expect(application.builder).toBe(builder);
    expect(application.mode).toBe("production");
    expect(application.artifacts.readText("index.html")).toBe("client-artifact");
    expect(application.artifacts.readText("Code.js")).toBe("server-artifact");
    expect(application.runtime).toBeInstanceOf(ReloadableLocalRuntime);
    expect(application.getLocalSpreadsheetStore?.()).toBe(initialRuntime.resources.spreadsheets);
    expect(createLocalRuntimeMock).toHaveBeenNthCalledWith(
      1,
      project,
      ["runtime/initial.ts"],
      getProgram,
      {
        spreadsheetUrlCapability: application.localSpreadsheetUrls,
      },
    );

    expect(getProgram()).toBe(program);
    expect(createRuntimeProgramMock).toHaveBeenCalledWith(application.artifacts);
    await expect(
      application.runtime.execute({
        functionName: "main",
        args: [],
      }),
    ).resolves.toBe("initial");

    await application.reloadRuntime();

    expect(scanRuntimeDataSourcesMock).toHaveBeenCalledWith(project);
    expect(createLocalRuntimeMock).toHaveBeenNthCalledWith(
      2,
      project,
      ["runtime/reloaded.ts"],
      getProgram,
      {
        spreadsheetUrlCapability: application.localSpreadsheetUrls,
      },
    );
    expect(application.getLocalSpreadsheetStore?.()).toBe(reloadedRuntime.resources.spreadsheets);
    await expect(
      application.runtime.execute({
        functionName: "main",
        args: [],
      }),
    ).resolves.toBe("reloaded");
  });
});
