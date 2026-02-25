import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

import { build } from "rolldown";

import { BaseConfig, GASManifest, OutputConfig, UserConfig } from "../shared/config";
import { resolvePath } from "./path";

export type ResolvedUserConfig = Required<BaseConfig> & {
  output: Required<OutputConfig>;
  gas: GASManifest;
};

async function transpileConfig(root: string, outputDir: string) {
  const configPath = join(root, "vegas.config.ts");
  if (!existsSync(configPath)) {
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
  return join(outputDir, output.fileName);
}

export async function loadConfig(root: string): Promise<UserConfig> {
  const tempDirPrefix = join(root, "node_modules", "vegas-");
  const tempDir = mkdtempSync(tempDirPrefix);
  const transpiledConfigPath = await transpileConfig(root, tempDir);
  const rawModule: { default: unknown } = await import(transpiledConfigPath);
  if (!rawModule.default) {
    throw new Error("config must export or return an object.");
  }
  rmSync(tempDir, { recursive: true, force: true });
  return rawModule.default;
}

export function resolveConfig(userConfig: UserConfig): ResolvedUserConfig {
  const root = resolvePath(userConfig.root);
  const webDir = resolve(join(root, userConfig.webDir ?? join("src", "web")));
  const serverDir = resolve(join(root, userConfig.serverDir ?? join("src", "server")));
  const gasMockDir = resolve(join(root, userConfig.gasMockDir ?? "mock"));
  const plugins = userConfig.plugins ?? [];
  const output = {
    dir: resolve(join(root, userConfig.output?.dir ?? "dist")),
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
