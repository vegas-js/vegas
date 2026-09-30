import path from "node:path";

import type { ViteBuilder } from "vite";
import { describe, expect, test, vi } from "vitest";

import { startDevApplication } from "../../dev/application";
import { buildDevTopology } from "../../dev/build-topology";
import { ReloadableLocalRuntime } from "../../dev/reloadable-local-runtime";
import { createRuntimeProgram } from "../../dev/runtime-program";
import { createGoogleAppsScriptUserRuntime } from "../../google-apps-script-runtime";
import { createLocalRuntime } from "../../local-runtime";
import { loadProject, scanRuntimeDataSources, type ResolvedProject } from "../../project";
import {
  InMemoryPropertiesStore,
  InMemorySpreadsheetStore,
  LocalRuntimeSession,
  type LocalRuntime,
  type Program,
} from "../../runtime";
import { runDevApplication } from "./dev-application";
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

vi.mock("../../local-runtime", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../local-runtime")>()),
  createLocalRuntime: vi.fn(),
}));

vi.mock("../../google-apps-script-runtime", () => ({
  createGoogleAppsScriptUserRuntime: vi.fn(),
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
const createGoogleAppsScriptUserRuntimeMock = vi.mocked(createGoogleAppsScriptUserRuntime);
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
      serverFunctions: {
        backend: "local",
      },
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
    const retriedRuntime = createRuntime("retried");
    const program = {
      source: "server-program",
      htmlFiles: {
        "index.html": "client-program",
      },
    } satisfies Program;
    const initialSnapshot = {
      properties: {
        source: "runtime/properties.ts",
        value: {
          scriptProperties: {
            environment: "initial",
          },
        },
      },
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
      properties: {
        source: "runtime/properties.ts",
        value: {
          scriptProperties: {
            environment: "reloaded",
          },
        },
      },
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
      properties: {
        source: "runtime/properties.ts",
        value: {
          scriptProperties: {
            environment: "failed",
          },
        },
      },
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
      .mockResolvedValueOnce(failedSnapshot)
      .mockResolvedValueOnce(failedSnapshot);
    createLocalRuntimeMock
      .mockResolvedValueOnce(initialRuntime)
      .mockResolvedValueOnce(reloadedRuntime)
      .mockRejectedValueOnce(new Error("runtime construction failed"))
      .mockResolvedValueOnce(retriedRuntime);
    scanRuntimeDataSourcesMock
      .mockResolvedValueOnce(["runtime/reloaded.ts"])
      .mockResolvedValueOnce(["runtime/failed.ts"])
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
    const reloadRuntime = application.reloadRuntime;

    if (initialCreateRuntimeCall === undefined) {
      throw new Error("expected initial Local Runtime creation");
    }
    if (reloadRuntime === undefined) {
      throw new Error("expected Local Runtime reload");
    }

    const getProgram = initialCreateRuntimeCall[2];
    const initialSession = initialCreateRuntimeCall[3]?.session;

    if (initialSession === undefined) {
      throw new Error("expected Local Runtime session");
    }

    const initialPropertiesStore = initialSession.stores.propertiesStore;
    const initialSpreadsheetStore = initialSession.stores.spreadsheetStore;

    expect(application.project).toBe(project);
    expect(application.builder).toBe(builder);
    expect(application.mode).toBe("production");
    expect(application.artifacts.readText("index.html")).toBe("client-artifact");
    expect(application.artifacts.readText("Code.js")).toBe("server-artifact");
    expect(application.runtime).toBeInstanceOf(ReloadableLocalRuntime);
    expect(application.serverFunctionRuntime).toBeUndefined();
    expect(createGoogleAppsScriptUserRuntimeMock).not.toHaveBeenCalled();
    expect(application.getLocalSpreadsheetStore?.()).toBe(initialSpreadsheetStore);
    expect(initialPropertiesStore).toBeInstanceOf(InMemoryPropertiesStore);
    expect(initialSession).toBeInstanceOf(LocalRuntimeSession);
    await expect(
      initialPropertiesStore.getAll({
        kind: "script",
        scriptKey: project.root,
      }),
    ).resolves.toStrictEqual({
      environment: "initial",
    });
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
        session: initialSession,
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

    await reloadRuntime();

    const reloadedCreateRuntimeCall = createLocalRuntimeMock.mock.calls[1];
    const reloadedSession = reloadedCreateRuntimeCall?.[3]?.session;

    if (reloadedSession === undefined) {
      throw new Error("expected reconciled Runtime session");
    }

    const reloadedPropertiesStore = reloadedSession.stores.propertiesStore;
    const reloadedSpreadsheetStore = reloadedSession.stores.spreadsheetStore;

    expect(scanRuntimeDataSourcesMock).toHaveBeenNthCalledWith(1, project);
    expect(loadRuntimeDataSnapshotMock).toHaveBeenNthCalledWith(2, project.root, [
      "runtime/reloaded.ts",
    ]);
    expect(reloadedSession).not.toBe(initialSession);
    expect(reloadedSession.stores.cacheStore).toBe(initialSession.stores.cacheStore);
    expect(reloadedSession.stores.driveIteratorStore).toBe(
      initialSession.stores.driveIteratorStore,
    );
    expect(reloadedSession.stores.driveStore).toBe(initialSession.stores.driveStore);
    expect(reloadedSession.stores.lockStore).toBe(initialSession.stores.lockStore);
    expect(reloadedPropertiesStore).not.toBe(initialPropertiesStore);
    expect(reloadedSpreadsheetStore).not.toBe(initialSpreadsheetStore);
    await expect(
      reloadedPropertiesStore.getAll({
        kind: "script",
        scriptKey: project.root,
      }),
    ).resolves.toStrictEqual({
      environment: "reloaded",
    });
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
        session: reloadedSession,
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

    await expect(reloadRuntime()).rejects.toThrow("runtime construction failed");

    const failedCreateRuntimeCall = createLocalRuntimeMock.mock.calls[2];
    const failedSession = failedCreateRuntimeCall?.[3]?.session;

    if (failedSession === undefined) {
      throw new Error("expected failed reconciled Runtime session");
    }

    const failedPropertiesStore = failedSession.stores.propertiesStore;
    const failedSpreadsheetStore = failedSession.stores.spreadsheetStore;

    expect(scanRuntimeDataSourcesMock).toHaveBeenNthCalledWith(2, project);
    expect(loadRuntimeDataSnapshotMock).toHaveBeenNthCalledWith(3, project.root, [
      "runtime/failed.ts",
    ]);
    expect(failedSession).not.toBe(reloadedSession);
    expect(failedSession.stores.cacheStore).toBe(reloadedSession.stores.cacheStore);
    expect(failedSession.stores.driveIteratorStore).toBe(reloadedSession.stores.driveIteratorStore);
    expect(failedSession.stores.driveStore).toBe(reloadedSession.stores.driveStore);
    expect(failedSession.stores.lockStore).toBe(reloadedSession.stores.lockStore);
    expect(failedPropertiesStore).not.toBe(reloadedPropertiesStore);
    expect(failedSpreadsheetStore).not.toBe(reloadedSpreadsheetStore);
    await expect(
      failedPropertiesStore.getAll({
        kind: "script",
        scriptKey: project.root,
      }),
    ).resolves.toStrictEqual({
      environment: "failed",
    });
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

    await reloadRuntime();

    const retriedCreateRuntimeCall = createLocalRuntimeMock.mock.calls[3];
    const retriedSession = retriedCreateRuntimeCall?.[3]?.session;

    if (retriedSession === undefined) {
      throw new Error("expected retried reconciled Runtime session");
    }

    const retriedPropertiesStore = retriedSession.stores.propertiesStore;
    const retriedSpreadsheetStore = retriedSession.stores.spreadsheetStore;

    expect(scanRuntimeDataSourcesMock).toHaveBeenNthCalledWith(3, project);
    expect(loadRuntimeDataSnapshotMock).toHaveBeenNthCalledWith(4, project.root, [
      "runtime/failed.ts",
    ]);
    expect(retriedSession).not.toBe(failedSession);
    expect(retriedSession.stores.cacheStore).toBe(reloadedSession.stores.cacheStore);
    expect(retriedSession.stores.driveIteratorStore).toBe(
      reloadedSession.stores.driveIteratorStore,
    );
    expect(retriedSession.stores.driveStore).toBe(reloadedSession.stores.driveStore);
    expect(retriedSession.stores.lockStore).toBe(reloadedSession.stores.lockStore);
    await expect(
      retriedPropertiesStore.getAll({
        kind: "script",
        scriptKey: project.root,
      }),
    ).resolves.toStrictEqual({
      environment: "failed",
    });
    await expect(
      retriedSpreadsheetStore.getSpreadsheetMetadata({
        service: "spreadsheet",
        kind: "spreadsheet",
        id: "budget",
      }),
    ).resolves.toStrictEqual({
      name: "Budget 2028",
    });
    expect(application.getLocalSpreadsheetStore?.()).toBe(retriedSpreadsheetStore);
    await expect(
      application.runtime.execute({
        functionName: "main",
        args: [],
      }),
    ).resolves.toBe("retried");
  });

  test("use Google backend only for server function calls", async () => {
    vi.clearAllMocks();

    const localProject = createProject();
    const project: ResolvedProject = {
      ...localProject,
      appsScript: {
        ...localProject.appsScript,
        scriptId: "script-id",
        serverFunctions: {
          backend: "google",
          profile: "work",
          devMode: true,
        },
        manifest: {
          ...localProject.appsScript.manifest,
          oauthScopes: ["scope-a", "scope-b"],
        },
      },
    };
    const builder = {} as ViteBuilder;
    const localRuntime = createRuntime("local");
    const googleRuntime = createRuntime("google");

    loadProjectMock.mockResolvedValueOnce(project);
    buildDevTopologyMock.mockResolvedValueOnce({
      snapshot: {
        clientSources: [],
        serverSources: [],
        runtimeDataSources: [],
        clientModuleEntries: [],
        clientHtmlEntries: [],
      },
      builder,
      clientArtifacts: [],
      serverArtifacts: [],
    });
    loadRuntimeDataSnapshotMock.mockResolvedValueOnce({
      spreadsheets: [],
    });
    createLocalRuntimeMock.mockResolvedValueOnce(localRuntime);
    createGoogleAppsScriptUserRuntimeMock.mockReturnValueOnce(googleRuntime);
    startDevApplicationMock.mockResolvedValueOnce(undefined);

    await runDevApplication("development");

    expect(createGoogleAppsScriptUserRuntimeMock).toHaveBeenCalledOnce();
    expect(createGoogleAppsScriptUserRuntimeMock).toHaveBeenCalledWith({
      scriptId: "script-id",
      profile: "work",
      requiredScopes: ["scope-a", "scope-b"],
      devMode: true,
    });
    expect(startDevApplicationMock).toHaveBeenCalledOnce();

    const [application] = startDevApplicationMock.mock.calls[0];

    expect(application.runtime).toBeInstanceOf(ReloadableLocalRuntime);
    expect(application.serverFunctionRuntime).toBe(googleRuntime);
    await expect(
      application.runtime.execute({
        functionName: "main",
        args: [],
      }),
    ).resolves.toBe("local");
  });
});
