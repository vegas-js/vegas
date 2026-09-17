import type { ArtifactStore } from "../build";
import type { Program } from "../runtime";

export function createRuntimeProgram(artifacts: ArtifactStore): Program {
  const htmlFiles: Record<string, string> = {};

  for (const artifactPath of artifacts.listPaths("client")) {
    if (artifactPath.endsWith(".html")) {
      htmlFiles[artifactPath] = artifacts.readText(artifactPath);
    }
  }

  return {
    source: artifacts.readText("Code.js"),
    htmlFiles,
  };
}
