import * as prompts from "@clack/prompts";
import { beforeEach, describe, expect, test, vi } from "vitest";

import type { PackageManager } from "../package-manager";
import { templates } from "../templates";
import {
  createTemplatePromptOptions,
  formatTemplateHelp,
  showCancelled,
  showCreateProjectResult,
  showCreateProjectStep,
} from "./presentation";

vi.mock("@clack/prompts", () => ({
  cancel: vi.fn(),
  log: {
    step: vi.fn(),
  },
  outro: vi.fn(),
}));

const cancelMock = vi.mocked(prompts.cancel);
const outroMock = vi.mocked(prompts.outro);
const stepMock = vi.mocked(prompts.log.step);

beforeEach(() => {
  cancelMock.mockReset();
  outroMock.mockReset();
  stepMock.mockReset();
});

describe("CLI presentation", () => {
  test("create template prompt options from registry", () => {
    const options = createTemplatePromptOptions();

    expect(options.map((option) => option.value)).toStrictEqual(
      templates.map((template) => template.id),
    );
  });

  test("format template help from registry directories", () => {
    expect(formatTemplateHelp()).toBe(
      templates
        .map((template) => template.directory.padStart(template.directory.length + 2))
        .join("\n"),
    );
  });

  test("show cancellation", () => {
    showCancelled();

    expect(cancelMock).toHaveBeenCalledWith("Operation cancelled");
  });

  test.each([
    [
      { kind: "scaffold", directory: "/workspace/my-app" } as const,
      "Scaffolding project in /workspace/my-app...",
    ],
    [{ kind: "login-apps-script" } as const, "Signing in to Google for Apps Script..."],
    [{ kind: "start-dev-server" } as const, "Starting dev server..."],
  ])("show project step: %j", (step, message) => {
    showCreateProjectStep(step);

    expect(stepMock).toHaveBeenCalledWith(message);
  });

  test.each(["npm", "pnpm", "yarn", "bun"] satisfies readonly PackageManager[])(
    "show install step for %s",
    (packageManager) => {
      showCreateProjectStep({
        kind: "install-dependencies",
        packageManager,
      });

      expect(stepMock).toHaveBeenCalledWith(`Installing dependencies with ${packageManager}...`);
    },
  );

  test.each([
    ["npm", "npm run login -- <oauth-client-json>"],
    ["pnpm", "pnpm run login <oauth-client-json>"],
    ["yarn", "yarn run login <oauth-client-json>"],
    ["bun", "bun run login <oauth-client-json>"],
  ] satisfies readonly [PackageManager, string][])(
    "show manual setup instructions for %s",
    (packageManager, loginCommand) => {
      showCreateProjectResult({
        cwd: "/workspace",
        directory: "/workspace/my-app",
        packageManager,
        scriptId: "script-id",
        installDependencies: false,
        startDevServer: false,
      });

      expect(outroMock).toHaveBeenCalledWith(
        [
          "Done. Now run:\n",
          "  cd my-app",
          `  ${packageManager} install`,
          `  ${loginCommand}`,
          `  ${packageManager} run dev`,
        ].join("\n"),
      );
    },
  );

  test("show completion after installed setup", () => {
    showCreateProjectResult({
      cwd: "/workspace",
      directory: "/workspace/my-app",
      packageManager: "npm",
      installDependencies: true,
      startDevServer: false,
    });

    expect(outroMock).toHaveBeenCalledWith("Done.");
  });

  test("do not show completion while dev server is running", () => {
    showCreateProjectResult({
      cwd: "/workspace",
      directory: "/workspace/my-app",
      packageManager: "npm",
      installDependencies: true,
      startDevServer: true,
    });

    expect(outroMock).not.toHaveBeenCalled();
  });
});
