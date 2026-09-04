import type { OAuthConfig, ReferenceConfig } from "../core/types";

export function loadReferenceConfig(): ReferenceConfig {
  const deploymentId = process.env.GAS_REFERENCE_DEPLOYMENT_ID;
  if (!deploymentId) {
    throw new Error("GAS_REFERENCE_DEPLOYMENT_ID is required");
  }
  const scriptId = process.env.GAS_REFERENCE_SCRIPT_ID;
  if (!scriptId) {
    throw new Error("GAS_REFERENCE_SCRIPT_ID is required");
  }

  const webAppUrl = process.env.GAS_REFERENCE_WEB_APP_URL;

  return {
    deploymentId,
    scriptId,
    ...(webAppUrl === undefined ? {} : { webAppUrl }),
  };
}

export function loadOAuthConfig(): OAuthConfig {
  const clientId = process.env.GAS_REFERENCE_OAUTH_CLIENT_ID;
  if (!clientId) {
    throw new Error("GAS_REFERENCE_OAUTH_CLIENT_ID is required");
  }

  const clientSecret = process.env.GAS_REFERENCE_OAUTH_CLIENT_SECRET;
  if (!clientSecret) {
    throw new Error("GAS_REFERENCE_OAUTH_CLIENT_SECRET is required");
  }

  const refreshToken = process.env.GAS_REFERENCE_REFRESH_TOKEN;
  if (!refreshToken) {
    throw new Error("GAS_REFERENCE_REFRESH_TOKEN is required");
  }

  return {
    clientId,
    clientSecret,
    refreshToken,
  };
}
