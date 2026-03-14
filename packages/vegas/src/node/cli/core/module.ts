import fs from "node:fs";
import module from "node:module";
import path from "node:path";

import { build, Rolldown } from "vite";

import { DisposableTempDir } from "./fs";

async function transpileModule(ctx: { root: string; filePath: string; outputDir: string }) {
  if (!fs.existsSync(ctx.filePath)) {
    throw new Error(`${ctx.filePath} is not found.`);
  }
  const result = await build({
    build: {
      lib: {
        entry: ctx.filePath,
        formats: ["es"],
      },
      rolldownOptions: {
        external: (id) => {
          return module.isBuiltin(id) || module.findPackageJSON(id, ctx.filePath) !== undefined;
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
  using tempDir = new DisposableTempDir(".vegas");
  const transpiledConfigPath = await transpileModule({
    root: ctx.root,
    filePath: ctx.filePath,
    outputDir: tempDir.getPath(),
  });
  const transpiledRelativeConfigPath = path.relative(import.meta.dirname, transpiledConfigPath);
  const rawModule: { default: unknown } = await import(transpiledRelativeConfigPath);
  if (!rawModule.default) {
    throw new Error("config must export or return an object.");
  }
  return rawModule.default;
}
