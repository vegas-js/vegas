import fs from "node:fs";
import module from "node:module";
import path from "node:path";
import url from "node:url";

import { build, Rolldown } from "vite";

import { DisposableTempDir } from "./temp";

function isBareImport(id: string): boolean {
  return !id.startsWith(".") && !path.isAbsolute(id);
}

async function transpileModule(ctx: { root: string; filePath: string; outputDir: string }) {
  if (!fs.existsSync(ctx.filePath)) {
    throw new Error(`${ctx.filePath} is not found.`);
  }
  const result = await build({
    root: ctx.root,
    configFile: false,
    build: {
      lib: {
        entry: ctx.filePath,
        fileName: path.parse(ctx.filePath).name,
        formats: ["es"],
      },
      rolldownOptions: {
        external: (id) => {
          if (module.isBuiltin(id)) {
            return true;
          }

          if (!isBareImport(id)) {
            return false;
          }

          return module.findPackageJSON(id, ctx.filePath) !== undefined;
        },
        treeshake: false,
        tsconfig: false,
        output: {
          dir: ctx.outputDir,
          minify: false,
        },
      },
    },
    logLevel: "silent",
  });
  const output = (
    (Array.isArray(result) ? result[0] : result) as Rolldown.RolldownOutput
  ).output.flat()[0] as Rolldown.OutputChunk;
  return path.join(ctx.outputDir, output.fileName);
}

export async function loadModule(ctx: { root: string; filePath: string }): Promise<any> {
  using tempDir = new DisposableTempDir(".vegas", ctx.root);

  const transpiledModulePath = await transpileModule({
    root: ctx.root,
    filePath: ctx.filePath,
    outputDir: tempDir.getPath(),
  });
  const moduleUrl = url.pathToFileURL(transpiledModulePath);
  const rawModule = (await import(moduleUrl.href)) as Record<string, unknown>;

  if (!Object.hasOwn(rawModule, "default")) {
    throw new Error("module must have a default export.");
  }

  return rawModule.default;
}
