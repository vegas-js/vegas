import { cac } from "cac";
import { describe, expect, test } from "vitest";

import { ConfigValidationError } from "../project/validate-config";
import { AppsScriptPushPrerequisiteError } from "../push/error";
import { CliUsageError, formatCliError } from "./error";

describe("formatCliError", () => {
  test("format config validation error", () => {
    const error = new ConfigValidationError('unknown option "appTyp".');

    expect(formatCliError(error)).toBe('Invalid Vegas config: unknown option "appTyp".');
  });

  test("do not format unexpected error", () => {
    expect(formatCliError(new Error("unexpected"))).toBeUndefined();
  });

  test("do not format non-error value", () => {
    expect(formatCliError("failure")).toBeUndefined();
  });

  test("format CLI usage error", () => {
    const error = new CliUsageError("Invalid command.");

    expect(formatCliError(error)).toBe("Invalid command.");
  });

  test("format CAC input error", () => {
    const cli = cac("vegas");

    cli.command("build [root]").action(() => {});

    cli.parse(["node", "vegas", "build", "project", "extra"], {
      run: false,
    });

    let error: unknown;

    try {
      cli.runMatchedCommand();
    } catch (caught) {
      error = caught;
    }

    expect(formatCliError(error)).toBe("Unused args: `extra`");
  });

  test("format Apps Script push prerequisite error", () => {
    const error = new AppsScriptPushPrerequisiteError(
      'Build output directory not found: /project/dist. Run "vegas build" before pushing.',
    );

    expect(formatCliError(error)).toBe(
      'Build output directory not found: /project/dist. Run "vegas build" before pushing.',
    );
  });
});
