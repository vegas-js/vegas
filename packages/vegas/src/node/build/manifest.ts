import type { GASManifest } from "../../shared/config";
import type { BuildArtifact } from "./artifact";

export function createGASManifestArtifact(manifest: GASManifest, webApp: boolean): BuildArtifact {
  const outputManifest: GASManifest = webApp
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
