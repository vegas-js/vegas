import type { AppsScriptProjectContent } from "./content";

export interface AppsScriptPushRequest {
  readonly scriptId: string;
  readonly content: AppsScriptProjectContent;
}

export function createAppsScriptPushRequest(
  scriptId: string,
  content: AppsScriptProjectContent,
): AppsScriptPushRequest {
  if (scriptId.trim().length === 0) {
    throw new Error("Apps Script script ID is required.");
  }

  return {
    scriptId,
    content,
  };
}
