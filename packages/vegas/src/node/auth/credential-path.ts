import path from "node:path";

interface ResolveAppsScriptCredentialPathOptions {
  readonly platform: NodeJS.Platform;
  readonly homeDir: string;
  readonly xdgConfigHome?: string;
  readonly appData?: string;
}

export function resolveAppsScriptCredentialPath(
  options: ResolveAppsScriptCredentialPathOptions,
): string {
  const platformPath = options.platform === "win32" ? path.win32 : path.posix;

  if (options.platform === "darwin") {
    return platformPath.join(
      options.homeDir,
      "Library",
      "Application Support",
      "vegas",
      "credentials.json",
    );
  }

  if (options.platform === "win32") {
    const configDir =
      options.appData !== undefined && platformPath.isAbsolute(options.appData)
        ? options.appData
        : platformPath.join(options.homeDir, "AppData", "Roaming");

    return platformPath.join(configDir, "vegas", "credentials.json");
  }

  const configDir =
    options.xdgConfigHome !== undefined && platformPath.isAbsolute(options.xdgConfigHome)
      ? options.xdgConfigHome
      : platformPath.join(options.homeDir, ".config");

  return platformPath.join(configDir, "vegas", "credentials.json");
}
