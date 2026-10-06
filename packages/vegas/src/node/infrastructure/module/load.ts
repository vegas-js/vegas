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
          codeSplitting: false,
          dir: ctx.outputDir,
          minify: false,
        },
      },
    },
    logLevel: "silent",
  });
  const outputs = (Array.isArray(result) ? result : [result]).flatMap((buildResult) =>
    "output" in buildResult ? buildResult.output : [],
  );
  const chunks = outputs.filter(
    (output): output is Rolldown.OutputChunk => output.type === "chunk",
  );

  if (chunks.length !== 1) {
    throw new Error(
      `Module transpilation must produce exactly one JavaScript chunk; received ${chunks.length}.`,
    );
  }

  return path.join(ctx.outputDir, chunks[0].fileName);
}

export async function loadModule(ctx: { root: string; filePath: string }): Promise<unknown> {
  using tempDir = new DisposableTempDir(".vegas", ctx.root);

  const transpiledModulePath = await transpileModule({
    root: ctx.root,
    filePath: ctx.filePath,
    outputDir: tempDir.getPath(),
  });
  const moduleUrl = url.pathToFileURL(transpiledModulePath);
  const rawModule: unknown = await import(moduleUrl.href);

  if (typeof rawModule !== "object" || rawModule === null || !Object.hasOwn(rawModule, "default")) {
    throw new Error("module must have a default export.");
  }

  const defaultExport: unknown = Reflect.get(rawModule, "default");

  return defaultExport;
}
