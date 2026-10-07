import { parseSync } from "vite";

import type { BuildArtifact } from "../artifact";

export function isWebApp(artifacts: readonly BuildArtifact[]): boolean {
  const serverArtifact = artifacts.find((artifact) => artifact.path === "Code.js");

  if (!serverArtifact || typeof serverArtifact.content !== "string") {
    return false;
  }

  const { program } = parseSync("Code.js", serverArtifact.content);

  for (const node of program.body) {
    if (node.type === "FunctionDeclaration" && node.id && /^do(Get|Post)$/.test(node.id.name)) {
      return true;
    }
  }

  return false;
}
