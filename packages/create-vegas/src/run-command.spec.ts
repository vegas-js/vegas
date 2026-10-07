import type { ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";

import spawn from "cross-spawn";
import { describe, expect, test, vi } from "vitest";

import { CreateVegasCommandError } from "./error";
import { runCommand } from "./run-command";

vi.mock("cross-spawn", () => ({
  default: vi.fn(),
}));

const spawnMock = vi.mocked(spawn);

function createChildProcess(): ChildProcess {
  return new EventEmitter() as ChildProcess;
}

describe("runCommand", () => {
  test("resolve successful command", async () => {
    const child = createChildProcess();

    spawnMock.mockReturnValue(child);

    const command = runCommand("npm", ["install"], {
      cwd: "/project",
      stdio: "inherit",
    });

    child.emit("close", 0, null);

    await expect(command).resolves.toBeUndefined();
  });

  test("reject failed command", async () => {
    const child = createChildProcess();

    spawnMock.mockReturnValue(child);

    const command = runCommand("npm", ["install"]);

    child.emit("close", 1, null);

    let error: unknown;

    try {
      await command;
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(CreateVegasCommandError);

    expect((error as Error).message).toBe("Command failed with exit code 1: npm install");
  });

  test("reject command start failure", async () => {
    const child = createChildProcess();

    spawnMock.mockReturnValue(child);

    const command = runCommand("npm", ["install"]);

    child.emit("error", new Error("spawn npm ENOENT"));

    await expect(command).rejects.toThrow('Failed to start command "npm": spawn npm ENOENT');
  });
});
