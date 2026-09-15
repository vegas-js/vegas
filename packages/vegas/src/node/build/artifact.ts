import fs from "node:fs";
import path from "node:path";

export interface BuildArtifact {
  readonly path: string;
  readonly content: string | Uint8Array;
}

export class ArtifactStore {
  readonly #artifacts = new Map<string, BuildArtifact["content"]>();

  constructor(artifacts: readonly BuildArtifact[] = []) {
    this.write(artifacts);
  }

  write(artifacts: readonly BuildArtifact[]): void {
    for (const artifact of artifacts) {
      this.#artifacts.set(artifact.path, artifact.content);
    }
  }

  readText(path: string): string {
    const content = this.#artifacts.get(path);

    if (content === undefined) {
      throw new Error(`Artifact not found: ${path}`);
    }

    return typeof content === "string" ? content : new TextDecoder().decode(content);
  }
}

export async function writeArtifacts(
  outputDir: string,
  artifacts: readonly BuildArtifact[],
): Promise<void> {
  const outputs = new Map<string, BuildArtifact["content"]>();

  for (const artifact of artifacts) {
    outputs.set(artifact.path, artifact.content);
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
