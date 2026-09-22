import { ArtifactStore } from "../build";
import type { ResolvedProject } from "../project";
import type { Program } from "../runtime";
import { replaceDevBuildArtifacts, type DevBuildArtifacts } from "./build-artifacts";
import { buildDevTopology } from "./build-topology";

type RuntimeProgramBuilder = (
  project: ResolvedProject,
  mode: "development" | "production",
) => Promise<DevBuildArtifacts>;

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

export async function buildRuntimeProgram(
  project: ResolvedProject,
  mode: "development" | "production",
  build: RuntimeProgramBuilder = buildDevTopology,
): Promise<Program> {
  const buildArtifacts = await build(project, mode);
  const artifacts = new ArtifactStore();

  replaceDevBuildArtifacts(artifacts, buildArtifacts);

  return createRuntimeProgram(artifacts);
}
