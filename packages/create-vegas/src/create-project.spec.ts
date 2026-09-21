import path from "node:path";

import { afterEach, describe, expect, test, vi } from "vitest";

import { createProject, type CreateProjectStep } from "./create-project";
import { runCommand } from "./run-command";
import { scaffoldProject } from "./scaffold-project";

vi.mock("./run-command", () => ({
  runCommand: vi.fn(),
}));

vi.mock("./scaffold-project", () => ({
  scaffoldProject: vi.fn(),
}));

const runCommandMock = vi.mocked(runCommand);
const scaffoldProjectMock = vi.mocked(scaffoldProject);

afterEach(() => {
  vi.clearAllMocks();
});

describe("createProject", () => {
  test("scaffold project without post-setup commands", async () => {
    const steps: CreateProjectStep[] = [];

    const target = await createProject({
      cwd: "/workspace",
      projectName: "my-app",
      packageName: "@example/my-app",
      templateDirectory: "/templates/react",
      operation: "create",
      scriptId: "script-id",
      installDependencies: false,
      startDevServer: false,
      onStep: (step) => steps.push(step),
    });

    expect(target).toStrictEqual({
      directory: path.resolve("/workspace", "my-app"),
      packageName: "@example/my-app",
    });

    expect(scaffoldProjectMock).toHaveBeenCalledWith({
      templateDirectory: "/templates/react",
      targetDirectory: target.directory,
      packageName: "@example/my-app",
      operation: "create",
      scriptId: "script-id",
    });

    expect(runCommandMock).not.toHaveBeenCalled();

    expect(steps).toStrictEqual([
      {
        kind: "scaffold",
        directory: target.directory,
      },
    ]);
  });

  test("run setup commands in order", async () => {
    runCommandMock.mockResolvedValue(undefined);

    const steps: CreateProjectStep[] = [];

    const target = await createProject({
      cwd: "/workspace",
      projectName: "my-app",
      packageName: "my-app",
      templateDirectory: "/templates/vanilla",
      operation: "keep",
      installDependencies: true,
      oauthClientFile: "/oauth/client.json",
      startDevServer: true,
      onStep: (step) => steps.push(step),
    });

    expect(scaffoldProjectMock).toHaveBeenCalledWith({
      templateDirectory: "/templates/vanilla",
      targetDirectory: target.directory,
      packageName: "my-app",
      operation: "keep",
      scriptId: undefined,
    });

    expect(runCommandMock.mock.calls).toStrictEqual([
      [
        "npm",
        ["install"],
        {
          cwd: target.directory,
          stdio: "inherit",
        },
      ],
      [
        "npm",
        ["run", "login", "--", "/oauth/client.json"],
        {
          cwd: target.directory,
          stdio: "inherit",
        },
      ],
      [
        "npm",
        ["run", "dev"],
        {
          cwd: target.directory,
          stdio: "inherit",
        },
      ],
    ]);

    expect(steps).toStrictEqual([
      {
        kind: "scaffold",
        directory: target.directory,
      },
      {
        kind: "install-dependencies",
      },
      {
        kind: "login-apps-script",
      },
      {
        kind: "start-dev-server",
      },
    ]);
  });
});
