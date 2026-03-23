import fs from "node:fs";
import path from "node:path";

import type { GASManifest } from "../../../shared/config";

export function generateManifest(outputDir: string, gasManifest: GASManifest) {
  const manifestPath = path.join(outputDir, "appsscript.json");
  const manifestJSON = JSON.stringify(gasManifest, null, 2);
  fs.writeFileSync(manifestPath, manifestJSON, { encoding: "utf8" });
}
