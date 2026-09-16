import type { AppsScriptManifest } from "../../shared/config";
import type { BuildArtifact } from "./artifact";

export function createGASManifestArtifact(
  manifest: AppsScriptManifest,
  webApp: boolean,
): BuildArtifact {
  const outputManifest: AppsScriptManifest = webApp
    ? { ...manifest }
    : {
        ...manifest,
        webapp: undefined,
      };

  return {
    path: "appsscript.json",
    content: JSON.stringify(outputManifest, null, 2),
  };
}
