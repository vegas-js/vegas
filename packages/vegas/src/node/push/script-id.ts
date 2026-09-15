interface AppsScriptScriptIdSources {
  readonly environmentScriptId?: string;
  readonly compatibilityScriptId?: string;
}

function requireScriptId(scriptId: string | undefined): string {
  if (scriptId === undefined || scriptId.trim().length === 0) {
    throw new Error("Apps Script script ID is required.");
  }

  return scriptId;
}

export function resolveAppsScriptScriptId(sources: AppsScriptScriptIdSources): string {
  if (sources.environmentScriptId !== undefined) {
    return requireScriptId(sources.environmentScriptId);
  }

  return requireScriptId(sources.compatibilityScriptId);
}
