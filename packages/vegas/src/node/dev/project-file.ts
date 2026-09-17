import path from "node:path";

import type { ResolvedProject } from "../project";

export type ProjectFileScope = "client" | "server";

function isInsideDirectory(directory: string, filePath: string): boolean {
  const relative = path.relative(directory, filePath);

  return (
    relative === "" ||
    (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))
  );
}

export function classifyProjectFile(
  project: ResolvedProject,
  filePath: string,
): ProjectFileScope | null {
  if (isInsideDirectory(project.clientDir, filePath)) {
    return "client";
  }

  if (isInsideDirectory(project.serverDir, filePath)) {
    return "server";
  }

  return null;
}
