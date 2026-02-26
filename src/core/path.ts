import fs from "node:fs";
import path from "node:path";

export function resolvePath(rawPath?: string) {
  const absolutePath = path.resolve(rawPath ?? process.cwd());
  if (!fs.existsSync(absolutePath)) {
    throw new Error("The directory or file does not exist.");
  }

  return absolutePath;
}
