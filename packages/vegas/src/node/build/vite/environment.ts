const CLIENT_MODULE_ENVIRONMENT_PREFIX = "client";
const CLIENT_HTML_ENVIRONMENT_PREFIX = "clientHtml";

export const CLIENT_MODULE_ENVIRONMENT_PATTERN = /^client\d+$/;
export const CLIENT_HTML_ENVIRONMENT_PATTERN = /^clientHtml\d+$/;
export const CLIENT_ENVIRONMENT_PATTERN = /^client(?:\d+|Html\d+)$/;
export const SERVER_ENVIRONMENT_NAME = "server";
export const SERVER_ENVIRONMENT_PATTERN = /^server$/;
export const DEFAULT_VITE_ENVIRONMENT_PATTERN = /^(client|ssr)$/;

export function createClientModuleEnvironmentName(index: number): string {
  return `${CLIENT_MODULE_ENVIRONMENT_PREFIX}${index}`;
}

export function getClientModuleEnvironmentIndex(environmentName: string): number | undefined {
  if (!CLIENT_MODULE_ENVIRONMENT_PATTERN.test(environmentName)) {
    return undefined;
  }

  return Number(environmentName.slice(CLIENT_MODULE_ENVIRONMENT_PREFIX.length));
}

export function createClientHtmlEnvironmentName(index: number): string {
  return `${CLIENT_HTML_ENVIRONMENT_PREFIX}${index}`;
}

export function getClientHtmlEnvironmentIndex(environmentName: string): number | undefined {
  if (!CLIENT_HTML_ENVIRONMENT_PATTERN.test(environmentName)) {
    return undefined;
  }

  return Number(environmentName.slice(CLIENT_HTML_ENVIRONMENT_PREFIX.length));
}
