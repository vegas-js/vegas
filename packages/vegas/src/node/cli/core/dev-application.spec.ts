import path from "node:path";

import type { ViteBuilder } from "vite";
import { describe, expect, test, vi } from "vitest";

import { startDevApplication } from "../../dev/application";
import { buildDevTopology } from "../../dev/build-topology";
import { ReloadableLocalRuntime } from "../../dev/reloadable-local-runtime";
import { createRuntimeProgram } from "../../dev/runtime-program";
import { loadProject, scanRuntimeDataSources, type ResolvedProject } from "../../project";
import {
  InMemorySpreadsheetStore,
  LocalRuntimeSession,
  type LocalRuntime,
  type Program,
} from "../../runtime";
import { runDevApplication } from "./dev-application";
import { createLocalRuntime } from "./local-runtime";
import { loadRuntimeDataSnapshot } from "./runtime-data";

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

vi.mock("./runtime-data", () => ({
  loadRuntimeDataSnapshot: vi.fn(),
}));

const startDevApplicationMock = vi.mocked(startDevApplication);
const buildDevTopologyMock = vi.mocked(buildDevTopology);
const createRuntimeProgramMock = vi.mocked(createRuntimeProgram);
const loadProjectMock = vi.mocked(loadProject);
const scanRuntimeDataSourcesMock = vi.mocked(scanRuntimeDataSources);
const createLocalRuntimeMock = vi.mocked(createLocalRuntime);
const loadRuntimeDataSnapshotMock = vi.mocked(loadRuntimeDataSnapshot);

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
    execute: vi.fn(async () => label),
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
  test("compose and transactionally reload the local dev application", async () => {
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
    const initialSnapshot = {
      spreadsheets: [
        {
          source: "runtime/budget.ts",
          value: {
            id: "budget",
            name: "Budget",
            sheets: [],
          },
        },
      ],
    };
    const reloadedSnapshot = {
      session: {
        source: "runtime/reloaded.ts",
        value: {
          activeUserEmail: "reloaded@example.com",
        },
      },
      spreadsheets: [
        {
          source: "runtime/budget.ts",
          value: {
            id: "budget",
            name: "Budget 2027",
            sheets: [],
          },
        },
      ],
    };
    const failedSnapshot = {
      spreadsheets: [
        {
          source: "runtime/budget.ts",
          value: {
            id: "budget",
            name: "Budget 2028",
            sheets: [],
          },
        },
      ],
    };

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
    loadRuntimeDataSnapshotMock
      .mockResolvedValueOnce(initialSnapshot)
      .mockResolvedValueOnce(reloadedSnapshot)
      .mockResolvedValueOnce(failedSnapshot);
    createLocalRuntimeMock
      .mockResolvedValueOnce(initialRuntime)
      .mockResolvedValueOnce(reloadedRuntime)
      .mockRejectedValueOnce(new Error("runtime construction failed"));
    scanRuntimeDataSourcesMock
      .mockResolvedValueOnce(["runtime/reloaded.ts"])
      .mockResolvedValueOnce(["runtime/failed.ts"]);
    startDevApplicationMock.mockResolvedValueOnce(undefined);

    await runDevApplication("production", "custom-root");

    expect(loadProjectMock).toHaveBeenCalledWith({
      cwd: process.cwd(),
      root: "custom-root",
    });
    expect(buildDevTopologyMock).toHaveBeenCalledWith(project, "production");
    expect(startDevApplicationMock).toHaveBeenCalledOnce();

    const [application] = startDevApplicationMock.mock.calls[0];
    const initialCreateRuntimeCall = createLocalRuntimeMock.mock.calls[0];

    if (initialCreateRuntimeCall === undefined) {
      throw new Error("expected initial Local Runtime creation");
    }

    const getProgram = initialCreateRuntimeCall[2];
    const runtimeSession = initialCreateRuntimeCall[3]?.session;
    const initialSpreadsheetStore = initialCreateRuntimeCall[3]?.spreadsheetStore;

    if (runtimeSession === undefined || initialSpreadsheetStore === undefined) {
      throw new Error("expected Local Runtime session and Spreadsheet store");
    }

    expect(application.project).toBe(project);
    expect(application.builder).toBe(builder);
    expect(application.mode).toBe("production");
    expect(application.artifacts.readText("index.html")).toBe("client-artifact");
    expect(application.artifacts.readText("Code.js")).toBe("server-artifact");
    expect(application.runtime).toBeInstanceOf(ReloadableLocalRuntime);
    expect(application.getLocalSpreadsheetStore?.()).toBe(initialSpreadsheetStore);
    expect(runtimeSession).toBeInstanceOf(LocalRuntimeSession);
    await expect(
      initialSpreadsheetStore.getSpreadsheetMetadata({
        service: "spreadsheet",
        kind: "spreadsheet",
        id: "budget",
      }),
    ).resolves.toStrictEqual({
      name: "Budget",
    });
    expect(loadRuntimeDataSnapshotMock).toHaveBeenNthCalledWith(1, project.root, [
      "runtime/initial.ts",
    ]);
    expect(createLocalRuntimeMock).toHaveBeenNthCalledWith(
      1,
      project,
      initialSnapshot,
      getProgram,
      {
        session: runtimeSession,
        spreadsheetStore: initialSpreadsheetStore,
        spreadsheetUrlCapability: application.localSpreadsheetUrls,
      },
    );
    expect(createLocalRuntimeMock.mock.calls[0]).toHaveLength(4);

    expect(getProgram()).toBe(program);
    expect(createRuntimeProgramMock).toHaveBeenCalledWith(application.artifacts);
    await expect(
      application.runtime.execute({
        functionName: "main",
        args: [],
      }),
    ).resolves.toBe("initial");

    await application.reloadRuntime();

    const reloadedCreateRuntimeCall = createLocalRuntimeMock.mock.calls[1];
    const reloadedSpreadsheetStore = reloadedCreateRuntimeCall?.[3]?.spreadsheetStore;

    if (reloadedSpreadsheetStore === undefined) {
      throw new Error("expected reconciled Spreadsheet store");
    }

    expect(scanRuntimeDataSourcesMock).toHaveBeenNthCalledWith(1, project);
    expect(loadRuntimeDataSnapshotMock).toHaveBeenNthCalledWith(2, project.root, [
      "runtime/reloaded.ts",
    ]);
    expect(reloadedSpreadsheetStore).not.toBe(initialSpreadsheetStore);
    await expect(
      reloadedSpreadsheetStore.getSpreadsheetMetadata({
        service: "spreadsheet",
        kind: "spreadsheet",
        id: "budget",
      }),
    ).resolves.toStrictEqual({
      name: "Budget 2027",
    });
    expect(createLocalRuntimeMock).toHaveBeenNthCalledWith(
      2,
      project,
      reloadedSnapshot,
      getProgram,
      {
        session: runtimeSession,
        spreadsheetStore: reloadedSpreadsheetStore,
        spreadsheetUrlCapability: application.localSpreadsheetUrls,
      },
    );
    expect(createLocalRuntimeMock.mock.calls[1]).toHaveLength(4);
    expect(application.getLocalSpreadsheetStore?.()).toBe(reloadedSpreadsheetStore);
    await expect(
      application.runtime.execute({
        functionName: "main",
        args: [],
      }),
    ).resolves.toBe("reloaded");

    await expect(application.reloadRuntime()).rejects.toThrow("runtime construction failed");

    const failedCreateRuntimeCall = createLocalRuntimeMock.mock.calls[2];
    const failedSpreadsheetStore = failedCreateRuntimeCall?.[3]?.spreadsheetStore;

    if (failedSpreadsheetStore === undefined) {
      throw new Error("expected failed reconciled Spreadsheet store");
    }

    expect(scanRuntimeDataSourcesMock).toHaveBeenNthCalledWith(2, project);
    expect(loadRuntimeDataSnapshotMock).toHaveBeenNthCalledWith(3, project.root, [
      "runtime/failed.ts",
    ]);
    expect(failedSpreadsheetStore).not.toBe(reloadedSpreadsheetStore);
    await expect(
      failedSpreadsheetStore.getSpreadsheetMetadata({
        service: "spreadsheet",
        kind: "spreadsheet",
        id: "budget",
      }),
    ).resolves.toStrictEqual({
      name: "Budget 2028",
    });
    expect(application.getLocalSpreadsheetStore?.()).toBe(reloadedSpreadsheetStore);
    await expect(
      application.runtime.execute({
        functionName: "main",
        args: [],
      }),
    ).resolves.toBe("reloaded");
  });
});
