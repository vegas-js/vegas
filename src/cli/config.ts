import fs from "node:fs";
import path from "node:path";

import { build } from "rolldown";

import { DisposableTempDir } from "../core";
import { resolvePath } from "../core";
import { BaseConfig, GASManifest, OutputConfig, UserConfig } from "../shared/config";

export type ResolvedUserConfig = Required<BaseConfig> & {
  output: Required<OutputConfig>;
  gas: GASManifest;
};

async function transpileConfig(root: string, outputDir: string) {
  const configPath = path.join(root, "vegas.config.ts");
  if (!fs.existsSync(configPath)) {
    throw new Error("vegas.config.ts is required.");
  }
  const result = await build({
    input: configPath,
    external: () => true,
    cwd: root,
    treeshake: false,
    tsconfig: false,
    output: {
      dir: outputDir,
    },
  });
  const output = result.output[0];
  return path.join(outputDir, output.fileName);
}

export async function loadConfig(root: string): Promise<UserConfig> {
  using tempDir = new DisposableTempDir(".vegas");
  const transpiledConfigPath = await transpileConfig(root, tempDir.getPath());
  const transpiledRelativeConfigPath = path.relative(import.meta.dirname, transpiledConfigPath);
  const rawModule: { default: unknown } = await import(transpiledRelativeConfigPath);
  if (!rawModule.default) {
    throw new Error("config must export or return an object.");
  }
  return rawModule.default;
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
