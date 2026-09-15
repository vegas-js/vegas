import path from "node:path";

import type { BuildArtifact } from "../build";

export interface AppsScriptProjectFile {
  readonly name: string;
  readonly type: "SERVER_JS" | "HTML" | "JSON";
  readonly source: string;
}

export interface AppsScriptProjectContent {
  readonly files: readonly AppsScriptProjectFile[];
}

function normalizeArtifactPath(artifactPath: string): string {
  const portablePath = artifactPath.replaceAll("\\", "/");
  const normalizedPath = path.posix.normalize(portablePath);

  if (
    path.posix.isAbsolute(portablePath) ||
    path.win32.isAbsolute(artifactPath) ||
    normalizedPath === ".." ||
    normalizedPath.startsWith("../")
  ) {
    throw new Error(`Invalid push artifact path: ${artifactPath}`);
  }

  return normalizedPath;
}

function readArtifactText(artifact: BuildArtifact): string {
  if (typeof artifact.content === "string") {
    return artifact.content;
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(artifact.content);
  } catch {
    throw new Error(`Push artifact must be UTF-8 text: ${artifact.path}`);
  }
}

function createProjectFile(artifact: BuildArtifact): AppsScriptProjectFile {
  const artifactPath = normalizeArtifactPath(artifact.path);

  if (artifactPath === "appsscript.json") {
    const source = readArtifactText(artifact);

    try {
      JSON.parse(source);
    } catch {
      throw new Error("Invalid Apps Script manifest: appsscript.json");
    }

    return {
      name: "appsscript",
      type: "JSON",
      source,
    };
  }

  const parsed = path.posix.parse(artifactPath);
  const name = path.posix.join(parsed.dir, parsed.name);

  if (parsed.ext === ".js") {
    return {
      name,
      type: "SERVER_JS",
      source: readArtifactText(artifact),
    };
  }

  if (parsed.ext === ".html") {
    return {
      name,
      type: "HTML",
      source: readArtifactText(artifact),
    };
  }

  throw new Error(`Unsupported push artifact: ${artifact.path}`);
}

function compareProjectFiles(a: AppsScriptProjectFile, b: AppsScriptProjectFile): number {
  if (a.name < b.name) {
    return -1;
  }

  if (a.name > b.name) {
    return 1;
  }

  if (a.type < b.type) {
    return -1;
  }

  if (a.type > b.type) {
    return 1;
  }

  return 0;
}

export function createAppsScriptProjectContent(
  artifacts: readonly BuildArtifact[],
): AppsScriptProjectContent {
  const files: AppsScriptProjectFile[] = [];
  const identities = new Set<string>();

  let hasManifest = false;
  for (const artifact of artifacts) {
    const file = createProjectFile(artifact);
    const identity = `${file.type}:${file.name}`;

    if (identities.has(identity)) {
      throw new Error(`Duplicate Apps Script project file: ${file.name}`);
    }

    identities.add(identity);

    if (file.type === "JSON" && file.name === "appsscript") {
      hasManifest = true;
    }

    files.push(file);
  }

  if (!hasManifest) {
    throw new Error("Apps Script manifest not found: appsscript.json");
  }

  files.sort(compareProjectFiles);

  return { files };
}
