import type { AppsScriptProjectContent } from "./content";
import type { AppsScriptPushRequest } from "./request";

const APPS_SCRIPT_API_BASE_URL = "https://script.googleapis.com/v1";

export interface AppsScriptUpdateContentHttpRequest {
  readonly method: "PUT";
  readonly url: string;
  readonly body: AppsScriptProjectContent;
}

export function createAppsScriptUpdateContentHttpRequest(
  request: AppsScriptPushRequest,
): AppsScriptUpdateContentHttpRequest {
  const scriptId = encodeURIComponent(request.scriptId);

  return {
    method: "PUT",
    url: `${APPS_SCRIPT_API_BASE_URL}/projects/${scriptId}/content`,
    body: request.content,
  };
}
