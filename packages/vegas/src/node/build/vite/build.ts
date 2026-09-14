import fs from "node:fs";
import path from "node:path";

import vfs from "@platformatic/vfs";
import type { Rolldown, ViteBuilder } from "vite";

type FileSystem = typeof fs | vfs.VirtualFileSystem;

export async function buildApp(fs: FileSystem, builder: ViteBuilder, envFilter?: RegExp) {
  const buildPromises = [];
  for (const environment of Object.values(builder.environments)) {
    if (/^(client|ssr)$/.test(environment.name)) {
      continue;
    }
    if (!envFilter || envFilter.test(environment.name)) {
      buildPromises.push(builder.build(environment));
    }
  }
  const buildResults = (await Promise.all(buildPromises)).flat() as Rolldown.RolldownOutput[];
  const outputs = buildResults.map((result) => result.output).flat();

  await Promise.all(
    outputs.map(async (output) => {
      const outputPath = path.join(builder.config.build.outDir, output.fileName);
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      const content =
        output.type === "asset" ? Buffer.from(output.source).toString("utf8") : output.code;
      return fs.promises.writeFile(outputPath, content);
    }),
  );
}
