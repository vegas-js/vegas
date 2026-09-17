import type { ArtifactStore } from "../build";
import type { Program } from "../runtime";

export function createRuntimeProgram(artifacts: ArtifactStore): Program {
  return {
    source: artifacts.readText("Code.js"),
  };
}
