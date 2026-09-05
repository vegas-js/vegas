import { Buffer } from "node:buffer";
import type vm from "node:vm";

import type { MaterializeScriptArguments } from "../execution/invocation";
import { createVmGasArrayFactory, createVmGasObjectFactory } from "../globals/object";

export interface WebAppTriggerRequest {
  readonly method: "GET" | "POST";
  readonly queryString?: string;
  readonly pathInfo?: string;
  readonly body?: string;
  readonly contentType?: string;
}

export interface WebAppTriggerInvocation {
  readonly functionName: "doGet" | "doPost";
  readonly args: readonly [WebAppTriggerRequest];
  readonly materializeArguments: MaterializeScriptArguments;
}

type ParameterEntry = readonly [string, string];

type UtilitiesFacade = {
  newBlob: (data: string, contentType?: string, name?: string) => unknown;
};

function encodeFormComponent(value: string): string {
  const parameters = new URLSearchParams();

  parameters.set("value", value);

  return parameters.toString().slice("value=".length);
}

function parseFormEncoded(value: string | undefined): ParameterEntry[] {
  if (value === undefined || value.length === 0) {
    return [];
  }

  return Array.from(new URLSearchParams(value).entries());
}

function normalizeQueryString(entries: readonly ParameterEntry[]): string {
  return entries
    .map(([name, value]) => {
      const encodedName = encodeFormComponent(name);

      if (value.length === 0) {
        return encodedName;
      }

      return `${encodedName}=${encodeFormComponent(value)}`;
    })
    .join("&");
}

function getMediaType(contentType: string | undefined): string | undefined {
  if (contentType === undefined) {
    return undefined;
  }

  return contentType.split(";", 1)[0]?.trim().toLowerCase();
}

function getBodyParameterEntries(request: WebAppTriggerRequest): ParameterEntry[] {
  if (
    request.method !== "POST" ||
    request.body === undefined ||
    getMediaType(request.contentType) !== "application/x-www-form-urlencoded"
  ) {
    return [];
  }

  return parseFormEncoded(request.body);
}

function defineGasProperty(
  target: Record<string, unknown>,
  name: string,
  value: unknown,
  writable: boolean = true,
): void {
  Object.defineProperty(target, name, {
    value,
    writable,
    enumerable: true,
    configurable: true,
  });
}

function createParameters(
  context: vm.Context,
  entries: readonly ParameterEntry[],
): {
  parameter: Record<string, unknown>;
  parameters: Record<string, unknown>;
} {
  const createObject = createVmGasObjectFactory(context);

  const createArray = createVmGasArrayFactory(context);

  const parameter = createObject();
  const parameters = createObject();

  for (const [name, value] of entries) {
    if (!Object.prototype.hasOwnProperty.call(parameter, name)) {
      defineGasProperty(parameter, name, value);
    }

    let values: string[];

    if (Object.prototype.hasOwnProperty.call(parameters, name)) {
      values = parameters[name] as string[];
    } else {
      values = createArray<string>();

      defineGasProperty(parameters, name, values);
    }

    values.push(value);
  }

  return {
    parameter,
    parameters,
  };
}

function requireUtilities(context: vm.Context): UtilitiesFacade {
  const globals = context as unknown as Record<string, unknown>;

  const utilities = globals.Utilities;

  if (utilities === null || (typeof utilities !== "object" && typeof utilities !== "function")) {
    throw new Error("Utilities is unavailable while materializing a web app event");
  }

  const newBlob = (utilities as Record<string, unknown>).newBlob;

  if (typeof newBlob !== "function") {
    throw new Error("Utilities.newBlob is unavailable while materializing a web app event");
  }

  return utilities as UtilitiesFacade;
}

function createPostData(
  context: vm.Context,
  request: WebAppTriggerRequest,
): Record<string, unknown> | undefined {
  if (
    request.method !== "POST" ||
    request.body === undefined ||
    Buffer.byteLength(request.body, "utf8") === 0
  ) {
    return undefined;
  }

  const utilities = requireUtilities(context);

  const postData = Reflect.apply(utilities.newBlob, utilities, [
    request.body,
    request.contentType,
    "postData",
  ]);

  if (postData === null || (typeof postData !== "object" && typeof postData !== "function")) {
    throw new Error("Utilities.newBlob returned an invalid web app postData value");
  }

  const record = postData as Record<string, unknown>;

  const getContentType = record.getContentType;

  if (typeof getContentType !== "function") {
    throw new Error("Web app postData Blob is missing getContentType");
  }

  /*
   * GAS exposes postData with the same JavaScript surface
   * as Blob, but String(postData) is "FileUpload".
   *
   * Keep the facade produced by Utilities.newBlob so
   * BlobSource unwrapping continues to use the same
   * per-execution BlobFacadeFactory.
   */
  record.toString = () => "FileUpload";

  /*
   * The actual Web App postData reports false rather than
   * the current generic Blob implementation's unsupported
   * isGoogleType behavior.
   */
  record.isGoogleType = () => false;

  const length = Buffer.byteLength(request.body, "utf8");

  const effectiveContentType = Reflect.apply(getContentType, postData, []);

  defineGasProperty(record, "contents", request.body, false);

  defineGasProperty(record, "length", length, false);

  defineGasProperty(record, "name", "postData", false);

  defineGasProperty(record, "type", effectiveContentType, false);

  return record;
}

function requireWebAppTriggerRequest(args: readonly unknown[]): WebAppTriggerRequest {
  if (args.length !== 1) {
    throw new TypeError(
      `Web App trigger materialization requires exactly one request argument, received ${args.length}`,
    );
  }

  const request = args[0];

  if (request === null || typeof request !== "object") {
    throw new TypeError("Web App trigger request must be an object");
  }

  const method = (
    request as {
      method?: unknown;
    }
  ).method;

  if (method !== "GET" && method !== "POST") {
    throw new TypeError("Web App trigger request method must be GET or POST");
  }

  return request as WebAppTriggerRequest;
}

export const materializeWebAppTriggerArguments: MaterializeScriptArguments = (context, args) => {
  const request = requireWebAppTriggerRequest(args);

  const createObject = createVmGasObjectFactory(context);

  const queryEntries = parseFormEncoded(request.queryString);

  const bodyEntries = getBodyParameterEntries(request);

  /*
   * Real GAS merges parameters in this order:
   *
   *   query values
   *   followed by form-urlencoded POST values
   *
   * parameter[name] is therefore the first query value
   * when a query/body collision exists.
   */
  const { parameter, parameters } = createParameters(context, [...queryEntries, ...bodyEntries]);

  const event = createObject();

  defineGasProperty(event, "queryString", normalizeQueryString(queryEntries));

  defineGasProperty(event, "contextPath", "");

  defineGasProperty(
    event,
    "contentLength",
    request.method === "GET" ? -1 : Buffer.byteLength(request.body ?? "", "utf8"),
  );

  defineGasProperty(event, "parameter", parameter);

  defineGasProperty(event, "parameters", parameters);

  if (request.pathInfo !== undefined && request.pathInfo.length > 0) {
    defineGasProperty(event, "pathInfo", request.pathInfo);
  }

  const postData = createPostData(context, request);

  if (postData !== undefined) {
    defineGasProperty(event, "postData", postData);
  }

  return [event];
};

export function createWebAppTriggerInvocation(
  request: WebAppTriggerRequest,
): WebAppTriggerInvocation {
  return {
    functionName: request.method === "GET" ? "doGet" : "doPost",

    args: [request],

    materializeArguments: materializeWebAppTriggerArguments,
  };
}
