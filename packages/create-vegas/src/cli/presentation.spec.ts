import * as prompts from "@clack/prompts";
import { beforeEach, describe, expect, test, vi } from "vitest";

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
    [{ kind: "install-dependencies" } as const, "Installing dependencies with npm..."],
    [{ kind: "login-apps-script" } as const, "Signing in to Google for Apps Script..."],
    [{ kind: "start-dev-server" } as const, "Starting dev server..."],
  ])("show project step: %j", (step, message) => {
    showCreateProjectStep(step);

    expect(stepMock).toHaveBeenCalledWith(message);
  });

  test("show manual setup instructions when dependencies are not installed", () => {
    showCreateProjectResult({
      cwd: "/workspace",
      directory: "/workspace/my-app",
      scriptId: "script-id",
      installDependencies: false,
      startDevServer: false,
    });

    expect(outroMock).toHaveBeenCalledWith(
      [
        "Done. Now run:\n",
        "  cd my-app",
        "  npm install",
        "  npm run login -- <oauth-client-json>",
        "  npm run dev",
      ].join("\n"),
    );
  });

  test("show completion after installed setup", () => {
    showCreateProjectResult({
      cwd: "/workspace",
      directory: "/workspace/my-app",
      installDependencies: true,
      startDevServer: false,
    });

    expect(outroMock).toHaveBeenCalledWith("Done.");
  });

  test("do not show completion while dev server is running", () => {
    showCreateProjectResult({
      cwd: "/workspace",
      directory: "/workspace/my-app",
      installDependencies: true,
      startDevServer: true,
    });

    expect(outroMock).not.toHaveBeenCalled();
  });
});
