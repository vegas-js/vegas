import type { AccessTokenProvider, ReferenceConfig } from "../core/types";

const MAX_ERROR_BODY_LENGTH = 2_000;

interface AppsScriptDeploymentConfig {
  scriptId?: string;
  versionNumber?: number;
  manifestFileName?: string;
  description?: string;
}

interface AppsScriptWebAppEntryPoint {
  url?: string;
  entryPointConfig?: {
    access?: string;
    executeAs?: string;
  };
}

interface AppsScriptExecutionApiEntryPoint {
  entryPointConfig?: {
    access?: string;
  };
}

interface AppsScriptEntryPoint {
  entryPointType?: string;
  webApp?: AppsScriptWebAppEntryPoint;
  executionApi?: AppsScriptExecutionApiEntryPoint;
}

interface AppsScriptDeployment {
  deploymentId?: string;
  deploymentConfig?: AppsScriptDeploymentConfig;
  entryPoints?: AppsScriptEntryPoint[];
}

export type ReferenceDeploymentEntryPointSummary =
  | {
      kind: "execution-api";
      access: string | null;
    }
  | {
      kind: "web-app";
      access: string | null;
      executeAs: string | null;
      url: string | null;
    }
  | {
      kind: "unknown";
      entryPointType: string | null;
    };

export interface ReferenceDeploymentSummary {
  deploymentId: string;
  versionNumber: number | null;
  manifestFileName: string | null;
  description: string | null;
  entryPoints: ReferenceDeploymentEntryPointSummary[];
}

function truncateErrorBody(body: string): string {
  if (body.length <= MAX_ERROR_BODY_LENGTH) {
    return body;
  }

  return `${body.slice(0, MAX_ERROR_BODY_LENGTH)}…`;
}

function normalizeEntryPoint(
  entryPoint: AppsScriptEntryPoint,
): ReferenceDeploymentEntryPointSummary {
  if (entryPoint.entryPointType === "EXECUTION_API" && entryPoint.executionApi !== undefined) {
    return {
      kind: "execution-api",
      access: entryPoint.executionApi.entryPointConfig?.access ?? null,
    };
  }

  if (entryPoint.entryPointType === "WEB_APP" && entryPoint.webApp !== undefined) {
    return {
      kind: "web-app",
      access: entryPoint.webApp.entryPointConfig?.access ?? null,
      executeAs: entryPoint.webApp.entryPointConfig?.executeAs ?? null,
      url: entryPoint.webApp.url ?? null,
    };
  }

  return {
    kind: "unknown",
    entryPointType: entryPoint.entryPointType ?? null,
  };
}

export async function getReferenceDeploymentSummary(
  config: ReferenceConfig,
  accessTokenProvider: AccessTokenProvider,
): Promise<ReferenceDeploymentSummary> {
  const accessToken = await accessTokenProvider.getAccessToken();

  const response = await fetch(
    `https://script.googleapis.com/v1/projects/${encodeURIComponent(
      config.scriptId,
    )}/deployments/${encodeURIComponent(config.deploymentId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `Apps Script deployment request failed: ${response.status} ${
        response.statusText
      }: ${truncateErrorBody(body)}`,
    );
  }

  const deployment = (await response.json()) as AppsScriptDeployment;

  if (deployment.deploymentId !== config.deploymentId) {
    throw new Error(
      `Apps Script deployment response contained unexpected deploymentId: ${
        deployment.deploymentId ?? "missing"
      }`,
    );
  }

  const deploymentConfig = deployment.deploymentConfig;

  return {
    deploymentId: deployment.deploymentId,
    versionNumber:
      typeof deploymentConfig?.versionNumber === "number" ? deploymentConfig.versionNumber : null,
    manifestFileName: deploymentConfig?.manifestFileName ?? null,
    description: deploymentConfig?.description ?? null,
    entryPoints: (deployment.entryPoints ?? []).map(normalizeEntryPoint),
  };
}
