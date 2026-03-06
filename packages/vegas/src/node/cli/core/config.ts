import fs from "node:fs";
import module from "node:module";
import path from "node:path";

import type { RolldownOutput, OutputChunk } from "rolldown";
import { build } from "vite";

import { DisposableTempDir } from ".";
import { resolvePath } from ".";
import { BaseConfig, GASManifest, OutputConfig, UserConfig } from "../../../shared/config";

export type ResolvedUserConfig = Required<BaseConfig> & {
  output: Required<OutputConfig>;
  gas: GASManifest;
};

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
          return (
            id.includes("/node_modules/") ||
            module.builtinModules.includes(id.replace(/^node:/, "")) ||
            fs.existsSync(path.resolve(path.join(process.cwd(), "node_modules", id)))
          );
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
    (Array.isArray(result) ? result[0] : result) as RolldownOutput
  ).output.flat()[0] as OutputChunk;
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

export async function loadConfig(root: string) {
  const mod = loadModule({ root, filePath: path.join(root, "vegas.config.ts") });

  return mod as UserConfig;
}

export function resolveConfig(userConfig: UserConfig): ResolvedUserConfig {
  const root = resolvePath(userConfig.root);
  const webDir = path.resolve(path.join(root, userConfig.webDir ?? path.join("src", "web")));
  const serverDir = path.resolve(
    path.join(root, userConfig.serverDir ?? path.join("src", "server")),
  );
  const gasMockDir = path.resolve(path.join(root, userConfig.gasMockDir ?? "mock"));
  const plugins = userConfig.plugins ?? [];
  const output = {
    dir: path.resolve(path.join(root, userConfig.output?.dir ?? "dist")),
  };
  const gas: GASManifest = {
    dependencies: userConfig.gas?.dependencies,
    exceptionLogging: userConfig.gas?.exceptionLogging ?? "STACKDRIVER",
    oauthScopes: userConfig.gas?.oauthScopes,
    runtimeVersion: userConfig.gas?.runtimeVersion ?? "V8",
    timeZone: userConfig.gas?.timeZone ?? "UTC",
    webapp: {
      access: userConfig.gas?.webapp?.access ?? "MYSELF",
      executeAs: userConfig.gas?.webapp?.executeAs ?? "USER_ACCESSING",
    },
  };

  return { root, webDir, serverDir, gasMockDir, plugins, output, gas };
}
