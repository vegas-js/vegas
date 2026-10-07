import { describe, expect, test } from "vitest";

import {
  createInstallCommand,
  createRunScriptCommand,
  packageManagers,
  type PackageManager,
} from "./package-manager";

describe("package manager commands", () => {
  test.each([
    ["npm", { command: "npm", args: ["install"] }],
    ["pnpm", { command: "pnpm", args: ["install"] }],
    ["yarn", { command: "yarn", args: ["install"] }],
    ["bun", { command: "bun", args: ["install"] }],
  ] satisfies readonly [PackageManager, ReturnType<typeof createInstallCommand>][])(
    "create %s install command",
    (packageManager, expected) => {
      expect(createInstallCommand(packageManager)).toStrictEqual(expected);
    },
  );

  test.each([
    ["npm", { command: "npm", args: ["run", "dev"] }],
    ["pnpm", { command: "pnpm", args: ["run", "dev"] }],
    ["yarn", { command: "yarn", args: ["run", "dev"] }],
    ["bun", { command: "bun", args: ["run", "dev"] }],
  ] satisfies readonly [PackageManager, ReturnType<typeof createRunScriptCommand>][])(
    "create %s script command",
    (packageManager, expected) => {
      expect(createRunScriptCommand(packageManager, "dev")).toStrictEqual(expected);
    },
  );

  test("separate npm options from script arguments", () => {
    expect(createRunScriptCommand("npm", "login", ["/oauth/client.json"])).toStrictEqual({
      command: "npm",
      args: ["run", "login", "--", "/oauth/client.json"],
    });
  });

  test.each(["pnpm", "yarn", "bun"] satisfies readonly PackageManager[])(
    "pass %s script arguments directly",
    (packageManager) => {
      expect(createRunScriptCommand(packageManager, "login", ["/oauth/client.json"])).toStrictEqual(
        {
          command: packageManager,
          args: ["run", "login", "/oauth/client.json"],
        },
      );
    },
  );

  test("keep supported package managers explicit", () => {
    expect(packageManagers).toStrictEqual(["npm", "pnpm", "yarn", "bun"]);
  });
});
