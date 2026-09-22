import type { ViteDevServer } from "vite";
import { describe, expect, test, vi } from "vitest";

import {
  createBrowserHarnessWithDependencies,
  type BrowserHarnessOptions,
} from "./browser-harness";
import type { EphemeralWebAppApplicationOptions } from "./dev/webapp/server-application";
import type { WebAppServerPair } from "./dev/webapp/server-pair";
import type { LocalRuntimeHarness, LocalRuntimeHarnessOptions } from "./local-runtime-harness";
import type { ResolvedProject } from "./project";
import {
  InMemoryPropertiesStore,
  InMemorySpreadsheetStore,
  LocalRuntimeSession,
  type LocalRuntime,
  type Program,
} from "./runtime";

const project = {
  root: "/project",
  configFile: "/project/vegas.config.ts",
  clientDir: "/project/src/client",
  serverDir: "/project/src/server",
  runtimeDataDir: "/project/runtime",
  outputDir: "/project/dist",
  appType: "spa",
  plugins: [],
  devServer: {
    open: false,
  },
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
} satisfies ResolvedProject;

const program = {
  source: "function main() { return 'ok'; }",
  htmlFiles: {},
} satisfies Program;

function createRuntimeHarness(): LocalRuntimeHarness {
  const spreadsheetStore = new InMemorySpreadsheetStore([]);
  const runtime = {
    execute: async () => undefined,
    resources: {
      spreadsheets: spreadsheetStore,
    },
  } satisfies LocalRuntime;

  return {
    appsScript: {
      execute: async () => undefined,
    },
    runtime,
    session: new LocalRuntimeSession(),
    propertiesStore: new InMemoryPropertiesStore(),
    spreadsheetStore,
  };
}

function createServerPair(dispose: () => Promise<void>): WebAppServerPair {
  return {
    host: {
      server: {} as ViteDevServer,
      port: 62000,
      origin: "http://127.0.0.1:62000",
    },
    userContent: {
      server: {} as ViteDevServer,
      port: 63000,
      origin: "http://127.0.0.1:63000",
    },
    dispose,
  };
}

describe("createBrowserHarnessWithDependencies", () => {
  test("compose a project Runtime and ephemeral web app into one harness", async () => {
    const options = {
      root: "./fixture",
      runtimeData: {
        properties: {
          scriptProperties: {
            environment: "browser",
          },
        },
        spreadsheets: [
          {
            id: "budget",
            name: "Budget",
            sheets: [],
          },
        ],
      },
    } satisfies BrowserHarnessOptions;
    const runtimeHarness = createRuntimeHarness();
    const loadProject = vi.fn(async () => project);
    const buildRuntimeProgram = vi.fn(async () => program);
    const createLocalRuntimeHarness = vi.fn(
      async (_options: LocalRuntimeHarnessOptions) => runtimeHarness,
    );
    const dispose = vi.fn(async () => undefined);
    const application = createServerPair(dispose);
    const startWebAppApplication = vi.fn(
      async (applicationOptions: EphemeralWebAppApplicationOptions) => {
        applicationOptions.localSpreadsheetUrls?.setOrigin(application.host.origin);
        return application;
      },
    );

    const harness = await createBrowserHarnessWithDependencies(options, {
      cwd: "/workspace",
      loadProject,
      buildRuntimeProgram,
      createLocalRuntimeHarness,
      startWebAppApplication,
    });

    expect(loadProject).toHaveBeenCalledWith({
      cwd: "/workspace",
      root: "./fixture",
    });
    expect(buildRuntimeProgram).toHaveBeenCalledWith(project, "development");

    const runtimeHarnessOptions = createLocalRuntimeHarness.mock.calls[0]?.[0];
    expect(runtimeHarnessOptions?.project).toBe(project);
    expect(runtimeHarnessOptions?.program).toBe(program);
    expect(runtimeHarnessOptions?.snapshot).toStrictEqual({
      properties: {
        source: "inline:properties",
        value: {
          scriptProperties: {
            environment: "browser",
          },
        },
      },
      spreadsheets: [
        {
          source: "inline:spreadsheets[0]",
          value: {
            id: "budget",
            name: "Budget",
            sheets: [],
          },
        },
      ],
    });

    const applicationOptions = startWebAppApplication.mock.calls[0]?.[0];
    expect(applicationOptions?.root).toBe(project.root);
    expect(applicationOptions?.configFile).toBe(project.configFile);
    expect(applicationOptions?.runtime).toBe(runtimeHarness.runtime);
    expect(applicationOptions?.getLocalSpreadsheetStore?.()).toBe(runtimeHarness.spreadsheetStore);
    expect(applicationOptions?.localSpreadsheetUrls).toBe(
      runtimeHarnessOptions?.spreadsheetUrlCapability,
    );

    expect(harness.appsScript).toBe(runtimeHarness.appsScript);
    expect(harness.runtime).toBe(runtimeHarness.runtime);
    expect(harness.session).toBe(runtimeHarness.session);
    expect(harness.propertiesStore).toBe(runtimeHarness.propertiesStore);
    expect(harness.spreadsheetStore).toBe(runtimeHarness.spreadsheetStore);
    expect(harness.urls).toStrictEqual({
      host: "http://127.0.0.1:62000/dev",
      userContent: "http://127.0.0.1:63000/userCodeAppPanel",
    });

    await harness.dispose();

    expect(dispose).toHaveBeenCalledOnce();
  });
});
