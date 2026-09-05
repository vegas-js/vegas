import type { AccessTokenProvider, ReferenceConfig } from "../core/types";

const REFERENCE_WEB_APP_DESCRIPTION_PREFIX = "vegas-reference-web-app:";
const REFERENCE_MANIFEST_FILE_NAME = "appsscript";

interface AppsScriptVersion {
  versionNumber?: number;
}

interface WebAppEntryPointConfig {
  access?: string;
  executeAs?: string;
}

interface WebAppEntryPoint {
  url?: string;
  entryPointConfig?: WebAppEntryPointConfig;
}

interface AppsScriptEntryPoint {
  entryPointType?: string;
  webApp?: WebAppEntryPoint;
}

interface AppsScriptDeploymentConfig {
  scriptId?: string;
  versionNumber?: number;
  manifestFileName?: string;
  description?: string;
}

interface AppsScriptDeployment {
  deploymentId?: string;
  deploymentConfig?: AppsScriptDeploymentConfig;
  entryPoints?: AppsScriptEntryPoint[];
}

interface ListDeploymentsResponse {
  deployments?: AppsScriptDeployment[];
  nextPageToken?: string;
}

async function requestJson<T>(url: string, accessToken: string, init: RequestInit): Promise<T> {
  const headers = new Headers(init.headers);

  headers.set("Authorization", `Bearer ${accessToken}`);

  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `Apps Script deployment request failed: ${response.status} ${response.statusText}: ${body}`,
    );
  }

  return (await response.json()) as T;
}

async function listDeployments(
  config: ReferenceConfig,
  accessToken: string,
): Promise<AppsScriptDeployment[]> {
  const deployments: AppsScriptDeployment[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(
      `https://script.googleapis.com/v1/projects/${encodeURIComponent(
        config.scriptId,
      )}/deployments`,
    );

    url.searchParams.set("pageSize", "50");

    if (pageToken !== undefined) {
      url.searchParams.set("pageToken", pageToken);
    }

    const response = await requestJson<ListDeploymentsResponse>(url.toString(), accessToken, {
      method: "GET",
    });

    deployments.push(...(response.deployments ?? []));
    pageToken = response.nextPageToken;
  } while (pageToken !== undefined && pageToken !== "");

  return deployments;
}

async function createVersion(
  config: ReferenceConfig,
  accessToken: string,
  description: string,
): Promise<number> {
  const version = await requestJson<AppsScriptVersion>(
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

async function createDeployment(
  config: ReferenceConfig,
  accessToken: string,
  versionNumber: number,
  description: string,
): Promise<AppsScriptDeployment> {
  return requestJson<AppsScriptDeployment>(
    `https://script.googleapis.com/v1/projects/${encodeURIComponent(config.scriptId)}/deployments`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({
        versionNumber,
        manifestFileName: REFERENCE_MANIFEST_FILE_NAME,
        description,
      }),
    },
  );
}

async function updateDeployment(
  config: ReferenceConfig,
  accessToken: string,
  deploymentId: string,
  versionNumber: number,
  description: string,
): Promise<AppsScriptDeployment> {
  return requestJson<AppsScriptDeployment>(
    `https://script.googleapis.com/v1/projects/${encodeURIComponent(
      config.scriptId,
    )}/deployments/${encodeURIComponent(deploymentId)}`,
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

function findReferenceDeployment(
  deployments: readonly AppsScriptDeployment[],
): AppsScriptDeployment | undefined {
  const matches = deployments.filter((deployment) =>
    deployment.deploymentConfig?.description?.startsWith(REFERENCE_WEB_APP_DESCRIPTION_PREFIX),
  );

  if (matches.length > 1) {
    throw new Error("Multiple Vegas reference web app deployments were found");
  }

  return matches[0];
}

function getDeploymentId(deployment: AppsScriptDeployment): string {
  const deploymentId = deployment.deploymentId;

  if (typeof deploymentId !== "string" || deploymentId === "") {
    throw new Error("Apps Script deployment did not contain a deploymentId");
  }

  return deploymentId;
}

function getWebAppUrl(deployment: AppsScriptDeployment): string {
  const entryPoint = deployment.entryPoints?.find(
    (candidate) => candidate.entryPointType === "WEB_APP" && candidate.webApp !== undefined,
  );

  if (entryPoint?.webApp === undefined) {
    throw new Error("Apps Script deployment did not contain a web app entry point");
  }

  const { url, entryPointConfig } = entryPoint.webApp;

  if (typeof url !== "string" || !url.endsWith("/exec")) {
    throw new Error("Apps Script web app deployment did not contain a valid /exec URL");
  }

  if (entryPointConfig?.access !== "ANYONE_ANONYMOUS") {
    throw new Error(
      `Apps Script reference web app access must be ANYONE_ANONYMOUS, received: ${
        entryPointConfig?.access ?? "unknown"
      }`,
    );
  }

  if (entryPointConfig.executeAs !== "USER_DEPLOYING") {
    throw new Error(
      `Apps Script reference web app executeAs must be USER_DEPLOYING, received: ${
        entryPointConfig.executeAs ?? "unknown"
      }`,
    );
  }

  return url;
}

export async function ensureReferenceWebAppDeployment(
  config: ReferenceConfig,
  accessTokenProvider: AccessTokenProvider,
  caseRevision: string,
): Promise<string> {
  const accessToken = await accessTokenProvider.getAccessToken();
  const description = `${REFERENCE_WEB_APP_DESCRIPTION_PREFIX}${caseRevision}`;

  const deployments = await listDeployments(config, accessToken);
  const existingDeployment = findReferenceDeployment(deployments);

  if (existingDeployment?.deploymentConfig?.description === description) {
    return getWebAppUrl(existingDeployment);
  }

  const versionNumber = await createVersion(config, accessToken, description);

  if (existingDeployment === undefined) {
    const deployment = await createDeployment(config, accessToken, versionNumber, description);

    return getWebAppUrl(deployment);
  }

  const deployment = await updateDeployment(
    config,
    accessToken,
    getDeploymentId(existingDeployment),
    versionNumber,
    description,
  );

  return getWebAppUrl(deployment);
}
