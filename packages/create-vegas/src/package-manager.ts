export const packageManagers = ["npm", "pnpm", "yarn", "bun"] as const;

export type PackageManager = (typeof packageManagers)[number];

export interface PackageManagerCommand {
  readonly command: PackageManager;
  readonly args: readonly string[];
}

export function createInstallCommand(packageManager: PackageManager): PackageManagerCommand {
  return {
    command: packageManager,
    args: ["install"],
  };
}

export function createRunScriptCommand(
  packageManager: PackageManager,
  script: string,
  args: readonly string[] = [],
): PackageManagerCommand {
  if (packageManager === "npm" && args.length > 0) {
    return {
      command: packageManager,
      args: ["run", script, "--", ...args],
    };
  }

  return {
    command: packageManager,
    args: ["run", script, ...args],
  };
}
