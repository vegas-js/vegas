import { readClaspScriptId } from "./clasp-compatibility";
import { resolveAppsScriptScriptId } from "./script-id";

interface LoadAppsScriptScriptIdOptions {
  readonly projectRoot: string;
  readonly projectScriptId?: string;
  readonly env?: NodeJS.ProcessEnv;
}

export async function loadAppsScriptScriptId(
  options: LoadAppsScriptScriptIdOptions,
): Promise<string> {
  const environmentScriptId = (options.env ?? process.env).VEGAS_SCRIPT_ID;

  if (environmentScriptId !== undefined) {
    return resolveAppsScriptScriptId({
      environmentScriptId,
    });
  }

  if (options.projectScriptId !== undefined) {
    return resolveAppsScriptScriptId({
      projectScriptId: options.projectScriptId,
    });
  }

  const compatibilityScriptId = await readClaspScriptId(options.projectRoot);

  return resolveAppsScriptScriptId({
    compatibilityScriptId,
  });
}
