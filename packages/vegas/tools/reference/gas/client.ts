import { ReferenceExecutionError } from "../core/executionError";
import type {
  AccessTokenProvider,
  JsonValue,
  ReferenceExecutor,
  ReferenceConfig,
} from "../core/types";

interface ScriptExecutionErrorDetail {
  errorMessage?: string;
  errorType?: string;
  scriptStackTraceElements?: Array<{
    function?: string;
    lineNumber?: number;
  }>;
}

interface ScriptRunOperation {
  done?: boolean;
  error?: {
    code?: number;
    message?: string;
    details?: ScriptExecutionErrorDetail[];
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

  async execute(functionName: string, parameters: readonly JsonValue[] = []): Promise<unknown> {
    const accessToken = await this.#accessTokenProvider.getAccessToken();

    const requestBody: {
      function: string;
      parameters?: readonly JsonValue[];
      devMode: true;
    } = {
      function: functionName,
      devMode: true,
    };

    if (parameters.length > 0) {
      requestBody.parameters = parameters;
    }

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
        body: JSON.stringify(requestBody),
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
      const detail = operation.error.details?.[0];

      throw new ReferenceExecutionError({
        statusCode: operation.error.code ?? null,
        statusMessage: operation.error.message ?? null,
        errorMessage: detail?.errorMessage ?? null,
        errorType: detail?.errorType ?? null,
        scriptStackTraceFunctions: (detail?.scriptStackTraceElements ?? []).flatMap((element) =>
          typeof element.function === "string" ? [element.function] : [],
        ),
      });
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
