import crypto from "node:crypto";
import fsPromises from "node:fs/promises";
import path from "node:path";

import type { AccessTokenProvider, ReferenceConfig } from "./types";

export interface ReferenceProjectFile {
  name: string;
  type: "SERVER_JS" | "JSON";
  source: string;
}

export async function loadReferenceProjectFiles(
  referenceDir: string,
): Promise<ReferenceProjectFile[]> {
  const manifestSource = await fsPromises.readFile(
    path.join(referenceDir, "appsscript.json"),
    "utf8",
  );
  const entries = await fsPromises.readdir(path.join(referenceDir, "cases"), {
    withFileTypes: true,
  });
  const caseFiles = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".js"))
      .map(async (entry) => ({
        name: path.basename(entry.name, ".js"),
        type: "SERVER_JS" as const,
        source: await fsPromises.readFile(path.join(referenceDir, "cases", entry.name), "utf8"),
      })),
  );

  return [
    {
      name: "appsscript",
      type: "JSON",
      source: manifestSource,
    },
    ...caseFiles,
  ];
}

export function computeCaseRevision(files: readonly ReferenceProjectFile[]): string {
  const canonicalFiles = [...files]
    .sort((a, b) => {
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return 0;
    })
    .map(({ name, type, source }) => ({
      name,
      type,
      source,
    }));

  return crypto.createHash("sha256").update(JSON.stringify(canonicalFiles)).digest("hex");
}

export async function updateReferenceProject(
  config: ReferenceConfig,
  accessTokenProvider: AccessTokenProvider,
  files: readonly ReferenceProjectFile[],
): Promise<void> {
  const accessToken = await accessTokenProvider.getAccessToken();
  const response = await fetch(
    `https://script.googleapis.com/v1/projects/${encodeURIComponent(config.scriptId)}/content`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        files,
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `Apps Script project update failed: ${response.status} ${response.statusText}: ${body}`,
    );
  }
}
