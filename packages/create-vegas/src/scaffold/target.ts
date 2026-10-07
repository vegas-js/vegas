import path from "node:path";

export interface ScaffoldTarget {
  readonly directory: string;
  readonly packageName: string;
}

export function resolveScaffoldTarget(
  cwd: string,
  directory: string,
  packageName: string,
): ScaffoldTarget {
  return {
    directory: path.resolve(cwd, directory),
    packageName,
  };
}
