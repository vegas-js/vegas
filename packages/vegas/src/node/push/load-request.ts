import { createAppsScriptProjectContent } from "./content";
import { loadAppsScriptScriptId } from "./load-script-id";
import { readBuildArtifacts } from "./read-output";
import { createAppsScriptPushRequest, type AppsScriptPushRequest } from "./request";

interface LoadAppsScriptPushRequestOptions {
  readonly projectRoot: string;
  readonly outputDir: string;
  readonly projectScriptId?: string;
}

export async function loadAppsScriptPushRequest(
  options: LoadAppsScriptPushRequestOptions,
): Promise<AppsScriptPushRequest> {
  const artifacts = await readBuildArtifacts(options.outputDir);
  const content = createAppsScriptProjectContent(artifacts);
  const scriptId = await loadAppsScriptScriptId({
    projectRoot: options.projectRoot,
    projectScriptId: options.projectScriptId,
  });

  return createAppsScriptPushRequest(scriptId, content);
}
