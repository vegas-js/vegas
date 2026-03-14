import fs from "node:fs";
import path from "node:path";

export function resolvePath(rawPath: string = "."): string {
  const absolutePath = path.isAbsolute(rawPath) ? rawPath : path.join(process.cwd(), rawPath);
  const resolvedPath = path.resolve(absolutePath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error("The directory or file does not exist.");
  }

  return resolvedPath;
}
