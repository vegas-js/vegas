import type { Rolldown, ViteBuilder } from "vite";

import type { BuildArtifact } from "../artifact";

export async function buildApp(builder: ViteBuilder, envFilter?: RegExp): Promise<BuildArtifact[]> {
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

  return buildResults
    .flatMap((result) => result.output)
    .map((output) => ({
      path: output.fileName,
      content: output.type === "asset" ? output.source : output.code,
    }));
}
