import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export interface BuildArtifact {
  readonly path: string;
  readonly content: string | Uint8Array;
}

export interface ArtifactScopeReplacement {
  readonly scope: string;
  readonly artifacts: readonly BuildArtifact[];
}

interface ArtifactStoreState {
  readonly artifacts: Map<string, BuildArtifact["content"]>;
  readonly scopePaths: Map<string, Set<string>>;
  readonly pathScopes: Map<string, string>;
}

function replaceScopeInState(
  state: ArtifactStoreState,
  scope: string,
  artifacts: readonly BuildArtifact[],
): void {
  const nextPaths = new Set(artifacts.map((artifact) => artifact.path));

  for (const artifact of artifacts) {
    const existingScope = state.pathScopes.get(artifact.path);

    if (existingScope !== undefined && existingScope !== scope) {
      throw new Error(`Artifact "${artifact.path}" already belongs to scope "${existingScope}".`);
    }
  }

  const previousPaths = state.scopePaths.get(scope);

  if (previousPaths) {
    for (const artifactPath of previousPaths) {
      if (nextPaths.has(artifactPath)) {
        continue;
      }

      state.artifacts.delete(artifactPath);
      state.pathScopes.delete(artifactPath);
    }
  }

  for (const artifact of artifacts) {
    state.artifacts.set(artifact.path, artifact.content);
    state.pathScopes.set(artifact.path, scope);
  }

  state.scopePaths.set(scope, nextPaths);
}

export class ArtifactStore {
  readonly #artifacts = new Map<string, BuildArtifact["content"]>();
  readonly #scopePaths = new Map<string, Set<string>>();
  readonly #pathScopes = new Map<string, string>();

  constructor(artifacts: readonly BuildArtifact[] = []) {
    this.write(artifacts);
  }

  write(artifacts: readonly BuildArtifact[]): void {
    for (const artifact of artifacts) {
      this.#artifacts.set(artifact.path, artifact.content);
    }
  }

  replaceScope(scope: string, artifacts: readonly BuildArtifact[]): void {
    this.replaceScopes([
      {
        scope,
        artifacts,
      },
    ]);
  }

  replaceScopes(replacements: readonly ArtifactScopeReplacement[]): void {
    const replacementScopes = new Map<string, string>();

    for (const replacement of replacements) {
      for (const artifact of replacement.artifacts) {
        const existingScope = this.#pathScopes.get(artifact.path);
        if (existingScope !== undefined && existingScope !== replacement.scope) {
          throw new Error(
            `Artifact "${artifact.path}" already belongs to scope "${existingScope}".`,
          );
        }

        const replacementScope = replacementScopes.get(artifact.path);
        if (replacementScope !== undefined && replacementScope !== replacement.scope) {
          throw new Error(
            `Artifact "${artifact.path}" already belongs to scope "${replacementScope}".`,
          );
        }

        replacementScopes.set(artifact.path, replacement.scope);
      }
    }

    const nextState: ArtifactStoreState = {
      artifacts: new Map(this.#artifacts),
      scopePaths: new Map(
        Array.from(this.#scopePaths, ([scope, paths]) => [scope, new Set(paths)]),
      ),
      pathScopes: new Map(this.#pathScopes),
    };

    for (const replacement of replacements) {
      replaceScopeInState(nextState, replacement.scope, replacement.artifacts);
    }

    this.#artifacts.clear();

    for (const [artifactPath, content] of nextState.artifacts) {
      this.#artifacts.set(artifactPath, content);
    }

    this.#scopePaths.clear();

    for (const [scope, paths] of nextState.scopePaths) {
      this.#scopePaths.set(scope, paths);
    }

    this.#pathScopes.clear();

    for (const [artifactPath, scope] of nextState.pathScopes) {
      this.#pathScopes.set(artifactPath, scope);
    }
  }

  listPaths(scope: string): readonly string[] {
    return Array.from(this.#scopePaths.get(scope) ?? []);
  }

  readText(path: string): string {
    const content = this.#artifacts.get(path);

    if (content === undefined) {
      throw new Error(`Artifact not found: ${path}`);
    }

    return typeof content === "string" ? content : new TextDecoder().decode(content);
  }
}

function normalizeArtifactPath(artifactPath: string): string {
  const portablePath = artifactPath.replaceAll("\\", "/");
  const normalizedPath = path.posix.normalize(portablePath);

  if (
    portablePath.length === 0 ||
    portablePath.includes("\0") ||
    path.posix.isAbsolute(portablePath) ||
    path.win32.isAbsolute(artifactPath) ||
    normalizedPath === "." ||
    normalizedPath === ".." ||
    normalizedPath.startsWith("../")
  ) {
    throw new Error(`Invalid build artifact path: ${artifactPath}`);
  }

  return normalizedPath;
}

export async function writeArtifacts(
  outputDir: string,
  artifacts: readonly BuildArtifact[],
): Promise<void> {
  const outputs = new Map<string, BuildArtifact["content"]>();

  for (const artifact of artifacts) {
    outputs.set(normalizeArtifactPath(artifact.path), artifact.content);
  }

  await Promise.all(
    Array.from(outputs, async ([artifactPath, content]) => {
      const filePath = path.join(outputDir, artifactPath);

      await fs.promises.mkdir(path.dirname(filePath), {
        recursive: true,
      });

      await fs.promises.writeFile(filePath, content);
    }),
  );
}

function createOutputReplacementPath(outputDir: string, kind: "staging" | "backup"): string {
  const name = path.basename(outputDir) || "output";

  return path.join(path.dirname(outputDir), `.${name}.${kind}-${crypto.randomUUID()}`);
}

async function renameIfExists(source: string, destination: string): Promise<boolean> {
  try {
    await fs.promises.rename(source, destination);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }

    throw error;
  }
}

async function cleanupFailedOutput(pathToRemove: string): Promise<void> {
  try {
    await fs.promises.rm(pathToRemove, {
      recursive: true,
      force: true,
    });
  } catch {
    // Preserve the replacement error that triggered cleanup.
  }
}

export async function replaceOutputArtifacts(
  outputDir: string,
  artifacts: readonly BuildArtifact[],
): Promise<void> {
  const stagingDir = createOutputReplacementPath(outputDir, "staging");
  const backupDir = createOutputReplacementPath(outputDir, "backup");

  try {
    await writeArtifacts(stagingDir, artifacts);
  } catch (error) {
    await cleanupFailedOutput(stagingDir);
    throw error;
  }

  let hasBackup: boolean;

  try {
    hasBackup = await renameIfExists(outputDir, backupDir);
  } catch (error) {
    await cleanupFailedOutput(stagingDir);
    throw error;
  }

  try {
    await fs.promises.rename(stagingDir, outputDir);
  } catch (error) {
    if (hasBackup) {
      try {
        await fs.promises.rename(backupDir, outputDir);
        hasBackup = false;
      } catch (rollbackError) {
        await cleanupFailedOutput(stagingDir);

        throw new AggregateError(
          [error, rollbackError],
          `Failed to replace build output and restore previous output. Previous output remains at ${backupDir}.`,
        );
      }
    }

    await cleanupFailedOutput(stagingDir);
    throw error;
  }

  if (hasBackup) {
    await fs.promises.rm(backupDir, {
      recursive: true,
      force: true,
    });
  }
}
