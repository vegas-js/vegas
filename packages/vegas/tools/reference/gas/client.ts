import type { AccessTokenProvider, ReferenceExecutor, ReferenceConfig } from "../core/types";

interface ScriptRunOperation {
  done?: boolean;
  error?: {
    code?: number;
    message?: string;
    details?: unknown[];
  };
  response?: {
    result?: unknown;
    [key: string]: unknown;
  };
}

class AppsScriptReferenceClient implements ReferenceExecutor {
  readonly #config: ReferenceConfig;
  readonly #accessTokenProvider: AccessTokenProvider;

  constructor(config: ReferenceConfig, accessTokenProvider: AccessTokenProvider) {
    this.#config = config;
    this.#accessTokenProvider = accessTokenProvider;
  }

  async execute(functionName: string): Promise<unknown> {
    const accessToken = await this.#accessTokenProvider.getAccessToken();
    const response = await fetch(
      `https://script.googleapis.com/v1/scripts/${encodeURIComponent(
        this.#config.deploymentId,
      )}:run`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          function: functionName,
          devMode: true,
        }),
      },
    );
    if (!response.ok) {
      const body = await response.text();

      throw new Error(
        `Apps Script API request failed: ${response.status} ${response.statusText}: ${body}`,
      );
    }

    const operation = (await response.json()) as ScriptRunOperation;
    if (operation.error) {
      throw new Error(operation.error.message ?? "Apps Script execution failed");
    }
    if (!operation.done) {
      throw new Error("Apps Script execution did not complete");
    }
    if (!operation.response) {
      throw new Error("Apps Script execution returned no response");
    }

    return operation.response.result;
  }
}

export function createReferenceClient(
  config: ReferenceConfig,
  accessTokenProvider: AccessTokenProvider,
) {
  return new AppsScriptReferenceClient(config, accessTokenProvider);
}
