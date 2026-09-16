import { cac } from "cac";
import { describe, expect, test } from "vitest";

import { CreateVegasCommandError, CreateVegasUsageError, formatCreateVegasError } from "./error";

describe("formatCreateVegasError", () => {
  test("format usage error", () => {
    const error = new CreateVegasUsageError('Target path "project" is not a directory.');

    expect(formatCreateVegasError(error)).toBe('Target path "project" is not a directory.');
  });

  test("format command error", () => {
    const error = new CreateVegasCommandError("Command failed with exit code 1: npm install");

    expect(formatCreateVegasError(error)).toBe("Command failed with exit code 1: npm install");
  });

  test("format CAC error", () => {
    const cli = cac("create-vegas");

    cli.command("[directory]").action(() => {});

    cli.parse(["node", "create-vegas", "project", "extra"], {
      run: false,
    });

    let error: unknown;

    try {
      cli.runMatchedCommand();
    } catch (caught) {
      error = caught;
    }

    expect(formatCreateVegasError(error)).toBe("Unused args: `extra`");
  });

  test("ignore unexpected error", () => {
    expect(formatCreateVegasError(new Error("unexpected"))).toBeUndefined();
  });
});
