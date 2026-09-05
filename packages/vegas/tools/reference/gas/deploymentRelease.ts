import type { AccessTokenProvider, ReferenceConfig } from "../core/types";
import { getReferenceDeploymentSummary, type ReferenceDeploymentSummary } from "./deployment";

const REFERENCE_DEPLOYMENT_DESCRIPTION_PREFIX = "vegas-reference:";
const REFERENCE_MANIFEST_FILE_NAME = "appsscript";
const MAX_ERROR_BODY_LENGTH = 2_000;

interface AppsScriptVersionResponse {
  versionNumber?: number;
}

function truncateErrorBody(body: string): string {
  if (body.length <= MAX_ERROR_BODY_LENGTH) {
    return body;
  }

  return `${body.slice(0, MAX_ERROR_BODY_LENGTH)}…`;
}

async function requestJson<T>(url: string, accessToken: string, init: RequestInit): Promise<T> {
  const headers = new Headers(init.headers);

  headers.set("Authorization", `Bearer ${accessToken}`);

  if (init.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `Apps Script deployment release request failed: ${response.status} ${
        response.statusText
      }: ${truncateErrorBody(body)}`,
    );
  }

  return (await response.json()) as T;
}

function assertExpectedExistingEntryPoints(deployment: ReferenceDeploymentSummary): void {
  const unknownEntryPoints = deployment.entryPoints.filter(
    (entryPoint) => entryPoint.kind === "unknown",
  );

  if (unknownEntryPoints.length > 0) {
    throw new Error(
      `Reference deployment contains unsupported entry points: ${JSON.stringify(
        unknownEntryPoints,
      )}`,
    );
  }

  const executionApiEntryPoints = deployment.entryPoints.filter(
    (entryPoint) => entryPoint.kind === "execution-api",
  );

  if (executionApiEntryPoints.length !== 1 || executionApiEntryPoints[0]?.access !== "MYSELF") {
    throw new Error(
      "Reference deployment must contain exactly one EXECUTION_API entry point with MYSELF access",
    );
  }

  const webAppEntryPoints = deployment.entryPoints.filter(
    (entryPoint) => entryPoint.kind === "web-app",
  );

  if (webAppEntryPoints.length > 1) {
    throw new Error("Reference deployment must not contain multiple WEB_APP entry points");
  }

  const existingWebApp = webAppEntryPoints[0];

  if (
    existingWebApp !== undefined &&
    (existingWebApp.access !== "ANYONE_ANONYMOUS" || existingWebApp.executeAs !== "USER_DEPLOYING")
  ) {
    throw new Error("Existing reference WEB_APP entry point has unexpected access configuration");
  }
}

function getWebAppUrl(deployment: ReferenceDeploymentSummary): string | undefined {
  const webAppEntryPoint = deployment.entryPoints.find(
    (entryPoint) => entryPoint.kind === "web-app",
  );

  if (webAppEntryPoint?.kind !== "web-app") {
    return undefined;
  }

  if (
    webAppEntryPoint.access !== "ANYONE_ANONYMOUS" ||
    webAppEntryPoint.executeAs !== "USER_DEPLOYING"
  ) {
    throw new Error("Reference WEB_APP entry point has unexpected access configuration");
  }

  if (typeof webAppEntryPoint.url !== "string" || !webAppEntryPoint.url.endsWith("/exec")) {
    throw new Error("Reference WEB_APP entry point did not contain a valid /exec URL");
  }

  return webAppEntryPoint.url;
}

async function createReferenceVersion(
  config: ReferenceConfig,
  accessToken: string,
  description: string,
): Promise<number> {
  const version = await requestJson<AppsScriptVersionResponse>(
    `https://script.googleapis.com/v1/projects/${encodeURIComponent(config.scriptId)}/versions`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({
        description,
      }),
    },
  );

  if (
    typeof version.versionNumber !== "number" ||
    !Number.isInteger(version.versionNumber) ||
    version.versionNumber < 1
  ) {
    throw new Error("Apps Script version response did not contain a valid versionNumber");
  }

  return version.versionNumber;
}

async function updateReferenceDeployment(
  config: ReferenceConfig,
  accessToken: string,
  versionNumber: number,
  description: string,
): Promise<void> {
  await requestJson<unknown>(
    `https://script.googleapis.com/v1/projects/${encodeURIComponent(
      config.scriptId,
    )}/deployments/${encodeURIComponent(config.deploymentId)}`,
    accessToken,
    {
      method: "PUT",
      body: JSON.stringify({
        deploymentConfig: {
          scriptId: config.scriptId,
          versionNumber,
          manifestFileName: REFERENCE_MANIFEST_FILE_NAME,
          description,
        },
      }),
    },
  );
}

export async function ensureReferenceDeployment(
  config: ReferenceConfig,
  accessTokenProvider: AccessTokenProvider,
  caseRevision: string,
): Promise<string> {
  const description = `${REFERENCE_DEPLOYMENT_DESCRIPTION_PREFIX}${caseRevision}`;

  const currentDeployment = await getReferenceDeploymentSummary(config, accessTokenProvider);

  assertExpectedExistingEntryPoints(currentDeployment);

  if (currentDeployment.manifestFileName !== REFERENCE_MANIFEST_FILE_NAME) {
    throw new Error(
      `Reference deployment manifest file must be ${REFERENCE_MANIFEST_FILE_NAME}, received: ${
        currentDeployment.manifestFileName ?? "missing"
      }`,
    );
  }

  if (currentDeployment.description === description) {
    const existingWebAppUrl = getWebAppUrl(currentDeployment);

    if (existingWebAppUrl !== undefined) {
      return existingWebAppUrl;
    }
  }

  const accessToken = await accessTokenProvider.getAccessToken();

  const versionNumber = await createReferenceVersion(config, accessToken, description);

  await updateReferenceDeployment(config, accessToken, versionNumber, description);

  const updatedDeployment = await getReferenceDeploymentSummary(config, accessTokenProvider);

  assertExpectedExistingEntryPoints(updatedDeployment);

  if (updatedDeployment.versionNumber !== versionNumber) {
    throw new Error(
      `Reference deployment version mismatch: expected ${versionNumber}, received ${
        updatedDeployment.versionNumber ?? "missing"
      }`,
    );
  }

  if (updatedDeployment.description !== description) {
    throw new Error("Reference deployment description did not match the current case revision");
  }

  const webAppUrl = getWebAppUrl(updatedDeployment);

  if (webAppUrl === undefined) {
    throw new Error("Reference deployment did not contain a WEB_APP entry point after update");
  }

  return webAppUrl;
}
