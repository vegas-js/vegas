import { existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

function resolvePath(rawPath?: string) {
  const absolutePath = rawPath ? (isAbsolute(rawPath) ? rawPath : resolve(rawPath)) : process.cwd();
  if (!existsSync(absolutePath)) {
    throw new Error("The directory specified by root does not exist.");
  }
  return absolutePath;
}

export function runBuild(root?: string) {
  const resolvedRoot = resolvePath(root);
  console.log("it works!");
  console.log(`root is ${resolvedRoot}`);
}
