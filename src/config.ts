import { existsSync, mkdtempDisposableSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { build } from "rolldown";

import { GASManifest, ResolvedUserConfig, UserConfig } from "./lib";

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
  using tempDir = mkdtempDisposableSync(tempDirPrefix);
  const transpiledConfigPath = await transpileConfig(root, tempDir.path);
  const rawModule: { default: unknown } = await import(transpiledConfigPath);
  if (!rawModule.default) {
    throw new Error("config must export or return an object.");
  }
  return rawModule.default;
}

export function resolveConfig(userConfig: UserConfig): ResolvedUserConfig {
  const root = userConfig.root
    ? isAbsolute(userConfig.root)
      ? userConfig.root
      : resolve(userConfig.root)
    : process.cwd();
  const webDir = resolve(join(root, userConfig.webDir ?? join("src", "web")));
  const serverDir = resolve(join(root, userConfig.serverDir ?? join("src", "server")));
  // const gasMockDir = resolve(join(root, userConfig.webDir ?? "mock"));
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

  return { root, webDir, serverDir, plugins, output, gas };
}
