import fs from "node:fs";
import path from "node:path";

export interface BuildArtifact {
  readonly path: string;
  readonly content: string | Uint8Array;
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
