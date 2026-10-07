import fs from "node:fs";

const EMPTY_SCRIPT_ID = "scriptId: ''";

export function writeAppsScriptScriptId(configPath: string, scriptId: string): void {
  const source = fs.readFileSync(configPath, "utf8");

  if (!source.includes(EMPTY_SCRIPT_ID)) {
    throw new Error("Apps Script script ID placeholder not found in Vegas config.");
  }

  const updated = source.replace(EMPTY_SCRIPT_ID, `scriptId: ${JSON.stringify(scriptId)}`);

  fs.writeFileSync(configPath, updated, "utf8");
}
