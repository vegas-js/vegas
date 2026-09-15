import { readClaspScriptId } from "./clasp-compatibility";
import { resolveAppsScriptScriptId } from "./script-id";

export async function loadAppsScriptScriptId(projectRoot: string): Promise<string> {
  const environmentScriptId = process.env.VEGAS_SCRIPT_ID;

  if (environmentScriptId !== undefined) {
    return resolveAppsScriptScriptId({
      environmentScriptId,
    });
  }

  const compatibilityScriptId = await readClaspScriptId(projectRoot);

  return resolveAppsScriptScriptId({
    compatibilityScriptId,
  });
}
