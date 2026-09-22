import { buildRuntimeProgram } from "./dev/runtime-program";
import { LocalSpreadsheetUrlResolver } from "./dev/webapp/local-spreadsheet-url";
import { startEphemeralWebAppApplication } from "./dev/webapp/server-application";
import { createLocalRuntimeHarness, type LocalRuntimeHarness } from "./local-runtime-harness";
import { loadProject } from "./project";
import {
  createRuntimeDataSnapshotFromFixture,
  type RuntimeDataFixture,
} from "./runtime-data-fixture";

export interface BrowserHarness extends LocalRuntimeHarness {
  readonly urls: {
    readonly host: string;
    readonly userContent: string;
  };
  readonly dispose: () => Promise<void>;
}

export interface BrowserHarnessOptions {
  readonly root?: string;
  readonly runtimeData?: RuntimeDataFixture;
}

interface BrowserHarnessDependencies {
  readonly cwd: string;
  readonly loadProject: typeof loadProject;
  readonly buildRuntimeProgram: typeof buildRuntimeProgram;
  readonly createLocalRuntimeHarness: typeof createLocalRuntimeHarness;
  readonly startWebAppApplication: typeof startEphemeralWebAppApplication;
}

function createBrowserUrls(hostOrigin: string, userContentOrigin: string) {
  return {
    host: new URL("/dev", hostOrigin).href,
    userContent: new URL("/userCodeAppPanel", userContentOrigin).href,
  };
}

export async function createBrowserHarnessWithDependencies(
  options: BrowserHarnessOptions,
  dependencies: BrowserHarnessDependencies,
): Promise<BrowserHarness> {
  const snapshot = createRuntimeDataSnapshotFromFixture(options.runtimeData);
  const project = await dependencies.loadProject({
    cwd: dependencies.cwd,
    root: options.root,
  });
  const program = await dependencies.buildRuntimeProgram(project, "development");
  const localSpreadsheetUrls = new LocalSpreadsheetUrlResolver();
  const runtimeHarness = await dependencies.createLocalRuntimeHarness({
    project,
    snapshot,
    program,
    spreadsheetUrlCapability: localSpreadsheetUrls,
  });
  const application = await dependencies.startWebAppApplication({
    root: project.root,
    configFile: project.configFile,
    runtime: runtimeHarness.runtime,
    getLocalSpreadsheetStore: () => runtimeHarness.spreadsheetStore,
    localSpreadsheetUrls,
  });

  return {
    ...runtimeHarness,
    urls: createBrowserUrls(application.host.origin, application.userContent.origin),
    dispose: () => application.dispose(),
  };
}

export async function createBrowserHarness(
  options: BrowserHarnessOptions = {},
): Promise<BrowserHarness> {
  return createBrowserHarnessWithDependencies(options, {
    cwd: process.cwd(),
    loadProject,
    buildRuntimeProgram,
    createLocalRuntimeHarness,
    startWebAppApplication: startEphemeralWebAppApplication,
  });
}
