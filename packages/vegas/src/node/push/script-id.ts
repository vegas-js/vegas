import { AppsScriptPushPrerequisiteError } from "./error";

interface AppsScriptScriptIdSources {
  readonly environmentScriptId?: string;
  readonly projectScriptId?: string;
  readonly compatibilityScriptId?: string;
}

function requireScriptId(scriptId: string | undefined): string {
  if (scriptId === undefined || scriptId.trim().length === 0) {
    throw new AppsScriptPushPrerequisiteError(
      "Apps Script script ID is required. Set appsScript.scriptId in vegas.config.ts or VEGAS_SCRIPT_ID. .clasp.json is used only when neither is defined.",
    );
  }

  return scriptId;
}

export function resolveAppsScriptScriptId(sources: AppsScriptScriptIdSources): string {
  if (sources.environmentScriptId !== undefined) {
    return requireScriptId(sources.environmentScriptId);
  }

  if (sources.projectScriptId !== undefined) {
    return requireScriptId(sources.projectScriptId);
  }

  return requireScriptId(sources.compatibilityScriptId);
}
