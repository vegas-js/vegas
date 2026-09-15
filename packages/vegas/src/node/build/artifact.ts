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
  await Promise.all(
    artifacts.map(async (artifact) => {
      const filePath = path.join(outputDir, artifact.path);

      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
      await fs.promises.writeFile(filePath, artifact.content);
    }),
  );
}
