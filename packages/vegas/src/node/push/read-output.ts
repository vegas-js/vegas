import fs from "node:fs";
import path from "node:path";

import type { BuildArtifact } from "../build";

function comparePaths(a: string, b: string): number {
  if (a < b) {
    return -1;
  }

  if (a > b) {
    return 1;
  }

  return 0;
}

async function assertOutputDirectory(outputDir: string): Promise<void> {
  try {
    const stat = await fs.promises.stat(outputDir);

    if (!stat.isDirectory()) {
      throw new Error(`Build output directory not found: ${outputDir}`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`Build output directory not found: ${outputDir}`);
    }

    throw error;
  }
}

export async function readBuildArtifacts(outputDir: string): Promise<BuildArtifact[]> {
  await assertOutputDirectory(outputDir);

  const entries = await fs.promises.readdir(outputDir, {
    recursive: true,
    withFileTypes: true,
  });

  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const filePath = path.join(entry.parentPath, entry.name);
      const relativePath = path.relative(outputDir, filePath);
      const artifactPath = relativePath.split(path.sep).join("/");

      return {
        artifactPath,
        filePath,
      };
    })
    .sort((a, b) => comparePaths(a.artifactPath, b.artifactPath));

  return Promise.all(
    files.map(async ({ artifactPath, filePath }) => ({
      path: artifactPath,
      content: await fs.promises.readFile(filePath),
    })),
  );
}
