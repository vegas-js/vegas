import crypto from "node:crypto";
import fsPromises from "node:fs/promises";
import path from "node:path";

import type { AccessTokenProvider, ReferenceConfig } from "../core/types";
import { bundleReferenceCases } from "./bundle";

export interface ReferenceProjectFile {
  name: string;
  type: "SERVER_JS" | "JSON";
  source: string;
}

const REFERENCE_READINESS_FUNCTION = "__vegasReferenceSourceRevision";

function assertCaseRevision(value: string): void {
  if (!/^[0-9a-f]{64}$/u.test(value)) {
    throw new Error("Reference case revision must be a lowercase SHA-256 hex digest");
  }
}

export function injectReferenceReadinessRevision(
  files: readonly ReferenceProjectFile[],
  caseRevision: string,
): ReferenceProjectFile[] {
  assertCaseRevision(caseRevision);

  let injected = false;

  const result = files.map((file) => {
    if (file.name !== "Code" || file.type !== "SERVER_JS") {
      return {
        ...file,
      };
    }

    if (injected) {
      throw new Error("Reference project contains multiple Code SERVER_JS files");
    }

    injected = true;

    return {
      ...file,

      source: [
        file.source,

        "/* Reference deployment readiness marker. */",

        `function ${REFERENCE_READINESS_FUNCTION}() {`,

        `  return ${JSON.stringify(caseRevision)};`,

        "}",
      ].join("\n\n"),
    };
  });

  if (!injected) {
    throw new Error("Reference project did not contain the Code SERVER_JS file");
  }

  return result;
}

export async function loadReferenceProjectFiles(
  referenceDir: string,
): Promise<ReferenceProjectFile[]> {
  const manifestSource = await fsPromises.readFile(
    path.join(referenceDir, "appsscript.json"),
    "utf8",
  );
  const bundledSource = await bundleReferenceCases(referenceDir);

  return [
    {
      name: "appsscript",
      type: "JSON",
      source: manifestSource,
    },
    {
      name: "Code",
      type: "SERVER_JS",
      source: bundledSource,
    },
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
