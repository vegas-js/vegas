import fs from "node:fs";

export type ScaffoldDirectoryState = "missing" | "empty" | "non-empty" | "invalid";

export function inspectScaffoldDirectory(directory: string): ScaffoldDirectoryState {
  if (!fs.existsSync(directory)) {
    return "missing";
  }

  const stat = fs.lstatSync(directory);

  if (!stat.isDirectory()) {
    return "invalid";
  }

  return fs.readdirSync(directory).length === 0 ? "empty" : "non-empty";
}
