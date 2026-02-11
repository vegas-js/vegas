import { existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

export function resolvePath(rawPath?: string) {
  const absolutePath = rawPath ? (isAbsolute(rawPath) ? rawPath : resolve(rawPath)) : process.cwd();
  if (!existsSync(absolutePath)) {
    throw new Error("The directory specified by root does not exist.");
  }
  return absolutePath;
}
