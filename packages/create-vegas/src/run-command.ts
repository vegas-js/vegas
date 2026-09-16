import type { SpawnOptions } from "node:child_process";

import spawn from "cross-spawn";

import { CreateVegasCommandError } from "./error";

function formatCommand(command: string, args: readonly string[] = []): string {
  return [command, ...args].join(" ");
}

export function runCommand(
  command: string,
  args: readonly string[] = [],
  options?: SpawnOptions,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, [...args], options);

    child.once("error", (error) => {
      reject(new CreateVegasCommandError(`Failed to start command "${command}": ${error.message}`));
    });

    child.once("close", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      const formattedCommand = formatCommand(command, args);

      if (code !== null) {
        reject(
          new CreateVegasCommandError(`Command failed with exit code ${code}: ${formattedCommand}`),
        );
        return;
      }

      reject(
        new CreateVegasCommandError(
          `Command terminated by signal ${signal ?? "unknown"}: ${formattedCommand}`,
        ),
      );
    });
  });
}
