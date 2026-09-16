import { beforeEach, describe, expect, test, vi } from "vitest";

import { loadProject, type ResolvedProject } from "../project";
import { pushAppsScriptProject } from "../push";
import { runPush } from "./push";

vi.mock("../project", () => ({
  loadProject: vi.fn(),
}));

vi.mock("../push", () => ({
  pushAppsScriptProject: vi.fn(),
}));

const loadProjectMock = vi.mocked(loadProject);

const pushAppsScriptProjectMock = vi.mocked(pushAppsScriptProject);

const project: ResolvedProject = {
  root: "/project",
  configFile: null,
  clientDir: "/project/src/client",
  serverDir: "/project/src/server",
  runtimeDataDir: "/project/runtime",
  outputDir: "/project/dist",
  appType: "spa",
  plugins: [],
  appsScript: {
    scriptId: "script-id",
    manifest: {},
  },
};

beforeEach(() => {
  loadProjectMock.mockReset();
  pushAppsScriptProjectMock.mockReset();

  loadProjectMock.mockResolvedValue(project);
});

describe("runPush", () => {
  test("push project and report success", async () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});

    await runPush("/project", {
      profile: "work",
    });

    expect(pushAppsScriptProjectMock).toHaveBeenCalledWith({
      projectRoot: "/project",
      outputDir: "/project/dist",
      projectScriptId: "script-id",
      profile: "work",
    });

    expect(consoleMock).toHaveBeenCalledWith("✓ Pushed project to Apps Script.");
  });
});
