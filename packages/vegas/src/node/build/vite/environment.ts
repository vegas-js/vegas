const CLIENT_ENVIRONMENT_PREFIX = "client";

export const CLIENT_ENVIRONMENT_PATTERN = /^client\d+$/;
export const SERVER_ENVIRONMENT_NAME = "server";
export const SERVER_ENVIRONMENT_PATTERN = /^server$/;
export const DEFAULT_VITE_ENVIRONMENT_PATTERN = /^(client|ssr)$/;

export function createClientEnvironmentName(index: number): string {
  return `${CLIENT_ENVIRONMENT_PREFIX}${index}`;
}

export function getClientEnvironmentIndex(environmentName: string): number | undefined {
  if (!CLIENT_ENVIRONMENT_PATTERN.test(environmentName)) {
    return undefined;
  }

  return Number(environmentName.slice(CLIENT_ENVIRONMENT_PREFIX.length));
}
