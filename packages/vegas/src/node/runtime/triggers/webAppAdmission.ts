import type { WebAppTriggerRequest } from "./webApp";

export type ReservedWebAppParameterName = "c" | "sid";

export interface WebAppTriggerRequestRejection {
  readonly kind: "reserved-parameter";

  readonly parameterName: ReservedWebAppParameterName;

  readonly source: "query" | "body";
}

const RESERVED_PARAMETER_NAMES = new Set<ReservedWebAppParameterName>(["c", "sid"]);

function getMediaType(contentType: string | undefined): string | undefined {
  if (contentType === undefined) {
    return undefined;
  }

  return contentType.split(";", 1)[0]?.trim().toLowerCase();
}

function findReservedParameter(
  encoded: string | undefined,
): ReservedWebAppParameterName | undefined {
  if (encoded === undefined || encoded.length === 0) {
    return undefined;
  }

  const parameters = new URLSearchParams(encoded);

  for (const name of parameters.keys()) {
    if (RESERVED_PARAMETER_NAMES.has(name as ReservedWebAppParameterName)) {
      return name as ReservedWebAppParameterName;
    }
  }

  return undefined;
}

export function getWebAppTriggerRequestRejection(
  request: WebAppTriggerRequest,
): WebAppTriggerRequestRejection | undefined {
  const queryParameter = findReservedParameter(request.queryString);

  if (queryParameter !== undefined) {
    return {
      kind: "reserved-parameter",

      parameterName: queryParameter,

      source: "query",
    };
  }

  if (
    request.method !== "POST" ||
    getMediaType(request.contentType) !== "application/x-www-form-urlencoded"
  ) {
    return undefined;
  }

  const bodyParameter = findReservedParameter(request.body);

  if (bodyParameter === undefined) {
    return undefined;
  }

  return {
    kind: "reserved-parameter",

    parameterName: bodyParameter,

    source: "body",
  };
}
