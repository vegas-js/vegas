import { describeReferenceBlobSurface } from "./blobObjectSurface";

const POST_DATA_SURFACE_PATH_INFO = "__vegas_reference/post-data-surface";

const WEB_APP_RESULT_PARAMETER = "__vegas_reference_result";

const WEB_APP_EVENT_PROPERTY_NAMES = [
  "queryString",
  "parameter",
  "parameters",
  "pathInfo",
  "contextPath",
  "contentLength",
  "postData",
] as const;

const WEB_APP_MIME_PARAMETER = "__vegas_reference_mime";

const WEB_APP_FILE_NAME_PARAMETER = "__vegas_reference_file";

const WEB_APP_READINESS_PARAMETER = "__vegas_reference_readiness";

const REFERENCE_READINESS_FUNCTION = "__vegasReferenceSourceRevision";

type ReferenceTextMimeType = "CSV" | "ICAL" | "JAVASCRIPT" | "JSON" | "TEXT" | "VCARD";

function createReferenceTextContent(mimeType: ReferenceTextMimeType | undefined): string {
  switch (mimeType) {
    case "CSV":
      return ["name,value", "vegas,reference", ""].join("\n");

    case "ICAL":
      return [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Vegas Reference//EN",
        "BEGIN:VEVENT",
        "UID:vegas-reference@example.invalid",
        "DTSTAMP:20260101T000000Z",
        "DTSTART:20260101T000000Z",
        "DTEND:20260101T010000Z",
        "SUMMARY:Vegas Reference",
        "END:VEVENT",
        "END:VCALENDAR",
        "",
      ].join("\r\n");

    case "JAVASCRIPT":
      return ["globalThis.vegasReference = {", "  ok: true", "};", ""].join("\n");

    case "JSON":
      return JSON.stringify({
        vegas: "reference",
      });

    case "VCARD":
      return ["BEGIN:VCARD", "VERSION:3.0", "FN:Vegas Reference", "END:VCARD", ""].join("\r\n");

    case "TEXT":
    case undefined:
      return "vegas-reference-text";
  }
}

const REFERENCE_TEXT_MIME_TYPES = new Set<ReferenceTextMimeType>([
  "CSV",
  "ICAL",
  "JAVASCRIPT",
  "JSON",
  "TEXT",
  "VCARD",
]);

interface PropertyDescriptorObservation {
  name: string;
  type: string;
  configurable: boolean;
  enumerable: boolean;
  writable: boolean | null;
  getter: boolean;
  setter: boolean;
}

function describeProperties(value: object): PropertyDescriptorObservation[] {
  return Object.getOwnPropertyNames(value)
    .map((propertyName) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, propertyName);

      if (!descriptor) {
        throw new Error(`Missing descriptor for ${propertyName}`);
      }

      return {
        name: propertyName,
        type: "value" in descriptor ? typeof descriptor.value : "accessor",
        configurable: descriptor.configurable ?? false,
        enumerable: descriptor.enumerable ?? false,
        writable: "writable" in descriptor ? (descriptor.writable ?? false) : null,
        getter: typeof descriptor.get === "function",
        setter: typeof descriptor.set === "function",
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function observeValue(value: unknown): unknown {
  if (value === null) {
    return {
      type: "object",
      value: null,
    };
  }

  if (typeof value === "function") {
    return {
      type: "function",
    };
  }

  if (typeof value !== "object") {
    return {
      type: typeof value,
      value: value === undefined ? null : value,
    };
  }

  if (value === null) {
    return {
      type: "object",
      value: null,
    };
  }

  if (typeof value !== "object" && typeof value !== "function") {
    return {
      type: typeof value,
      value: value === undefined ? null : value,
    };
  }

  const objectValue = value as object;
  const prototype = Object.getPrototypeOf(objectValue);
  const array = Array.isArray(objectValue);

  const keys = Object.keys(objectValue);

  if (!array) {
    keys.sort((a, b) => a.localeCompare(b));
  }

  const ownPropertyNames = Object.getOwnPropertyNames(objectValue);

  if (!array) {
    ownPropertyNames.sort((a, b) => a.localeCompare(b));
  }

  return {
    type: typeof value,
    tag: Object.prototype.toString.call(objectValue),
    array,
    instanceOfObject: objectValue instanceof Object,
    instanceOfArray: objectValue instanceof Array,
    prototypeIsNull: prototype === null,
    prototypeIsObjectPrototype: prototype === Object.prototype,
    prototypeIsArrayPrototype: prototype === Array.prototype,
    constructorIsObject:
      prototype !== null &&
      "constructor" in objectValue &&
      (objectValue as { constructor?: unknown }).constructor === Object,
    constructorIsArray:
      prototype !== null &&
      "constructor" in objectValue &&
      (objectValue as { constructor?: unknown }).constructor === Array,
    keys,
    ownPropertyNames,
    ownPropertySymbols: describeOwnPropertySymbols(objectValue),
    properties: describeProperties(objectValue),
    entries: keys.map((name) => ({
      name,
      value: observeValue((objectValue as Record<string, unknown>)[name]),
    })),
  };
}

function observeKnownProperties(value: unknown) {
  if (value === null || (typeof value !== "object" && typeof value !== "function")) {
    return WEB_APP_EVENT_PROPERTY_NAMES.map((name) => ({
      name,
      own: false,
      inherited: false,
      type: "undefined",
    }));
  }

  const record = value as Record<string, unknown>;

  return WEB_APP_EVENT_PROPERTY_NAMES.map((name) => ({
    name,
    own: Object.prototype.hasOwnProperty.call(record, name),
    inherited: name in record,
    type: typeof record[name],
  }));
}

function createJsonTextOutput(content: string): unknown {
  const globals = globalThis as unknown as Record<string, unknown>;
  const contentService = globals.ContentService;

  if (
    contentService === null ||
    (typeof contentService !== "object" && typeof contentService !== "function")
  ) {
    throw new Error("ContentService is unavailable");
  }

  const contentServiceRecord = contentService as Record<string, unknown>;
  const createTextOutput = contentServiceRecord.createTextOutput;

  if (typeof createTextOutput !== "function") {
    throw new Error("ContentService.createTextOutput is unavailable");
  }

  const mimeType = contentServiceRecord.MimeType;

  if (mimeType === null || typeof mimeType !== "object") {
    throw new Error("ContentService.MimeType is unavailable");
  }

  const jsonMimeType = (mimeType as Record<string, unknown>).JSON;

  if (jsonMimeType === undefined) {
    throw new Error("ContentService.MimeType.JSON is unavailable");
  }

  const output = Reflect.apply(createTextOutput, contentService, [content]);

  if (output === null || (typeof output !== "object" && typeof output !== "function")) {
    throw new Error("ContentService.createTextOutput returned an invalid value");
  }

  const setMimeType = (output as Record<string, unknown>).setMimeType;

  if (typeof setMimeType !== "function") {
    throw new Error("TextOutput.setMimeType is unavailable");
  }

  return Reflect.apply(setMimeType, output, [jsonMimeType]);
}

function createWebAppEventObservation(event: unknown, argumentCount: number) {
  return {
    argumentCount,
    event: observeValue(event),
    knownProperties: observeKnownProperties(event),
  };
}

export function doGet(event: unknown) {
  const readiness = createReferenceReadinessValue(event);

  if (readiness.handled) {
    return readiness.value;
  }

  const resultContract = createWebAppResultContractValue(event);

  if (resultContract.handled) {
    return resultContract.value;
  }

  return createJsonTextOutput(
    JSON.stringify(createWebAppEventObservation(event, arguments.length)),
  );
}

function capturePostDataCall(postData: object, methodName: string) {
  const method = (postData as Record<string, unknown>)[methodName];

  if (typeof method !== "function") {
    return {
      present: false,
      threw: false,
      value: null,
      errorName: null,
      errorMessage: null,
    };
  }

  try {
    return {
      present: true,
      threw: false,
      value: Reflect.apply(method, postData, []),
      errorName: null,
      errorMessage: null,
    };
  } catch (error) {
    const candidate = error as {
      name?: unknown;
      message?: unknown;
    } | null;

    return {
      present: true,
      threw: true,
      value: null,
      errorName: typeof candidate?.name === "string" ? candidate.name : typeof error,
      errorMessage: typeof candidate?.message === "string" ? candidate.message : String(error),
    };
  }
}

function createPostDataObservation(event: unknown) {
  if (event === null || typeof event !== "object") {
    return {
      present: false,
    };
  }

  const postData = (event as Record<string, unknown>).postData;

  if (postData === null || typeof postData !== "object") {
    return {
      present: false,
    };
  }

  const record = postData as Record<string, unknown>;

  return {
    present: true,

    surface: describeReferenceBlobSurface(postData),

    fields: {
      contents: record.contents,
      length: record.length,
      name: record.name,
      type: record.type,
    },

    methods: {
      // oxlint-disable-next-line no-base-to-string
      stringify: String(postData),

      getName: capturePostDataCall(postData, "getName"),

      getContentType: capturePostDataCall(postData, "getContentType"),

      getDataAsString: capturePostDataCall(postData, "getDataAsString"),

      getBytes: capturePostDataCall(postData, "getBytes"),

      isGoogleType: capturePostDataCall(postData, "isGoogleType"),
    },
  };
}

function describeOwnPropertySymbols(value: object): string[] {
  return Object.getOwnPropertySymbols(value)
    .map((symbol) => String(symbol))
    .filter((symbol) => !symbol.startsWith("Symbol(__GS_INTERNAL_"))
    .sort((left, right) => left.localeCompare(right));
}

function createReferenceHtmlOutput(content: string): unknown {
  const globals = globalThis as unknown as Record<string, unknown>;

  const htmlService = globals.HtmlService;

  if (
    htmlService === null ||
    (typeof htmlService !== "object" && typeof htmlService !== "function")
  ) {
    throw new Error("HtmlService is unavailable");
  }

  const createHtmlOutput = (htmlService as Record<string, unknown>).createHtmlOutput;

  if (typeof createHtmlOutput !== "function") {
    throw new Error("HtmlService.createHtmlOutput is unavailable");
  }

  return Reflect.apply(createHtmlOutput, htmlService, [content]);
}

function createReferenceTextOutput(content: string): unknown {
  const globals = globalThis as unknown as Record<string, unknown>;

  const contentService = globals.ContentService;

  if (
    contentService === null ||
    (typeof contentService !== "object" && typeof contentService !== "function")
  ) {
    throw new Error("ContentService is unavailable");
  }

  const createTextOutput = (contentService as Record<string, unknown>).createTextOutput;

  if (typeof createTextOutput !== "function") {
    throw new Error("ContentService.createTextOutput is unavailable");
  }

  return Reflect.apply(createTextOutput, contentService, [content]);
}

function createWebAppResultContractValue(event: unknown):
  | {
      handled: false;
    }
  | {
      handled: true;
      value: unknown;
    } {
  switch (getWebAppResultSelector(event)) {
    case "html":
      return {
        handled: true,
        value: createReferenceHtmlOutput("<p>vegas-reference-html</p>"),
      };

    case "text": {
      const mimeType = getReferenceTextMimeType(event);
      return {
        handled: true,
        value: configureReferenceTextOutput(
          createReferenceTextOutput(createReferenceTextContent(mimeType)),
          event,
        ),
      };
    }

    case "invalid":
      return {
        handled: true,
        value: {
          value: "invalid-web-app-result",
        },
      };

    default:
      return {
        handled: false,
      };
  }
}

function getWebAppResultSelector(event: unknown): string | undefined {
  return getWebAppParameter(event, WEB_APP_RESULT_PARAMETER);
}

function getWebAppParameter(event: unknown, name: string): string | undefined {
  if (event === null || typeof event !== "object") {
    return undefined;
  }

  const parameter = (event as Record<string, unknown>).parameter;

  if (parameter === null || typeof parameter !== "object") {
    return undefined;
  }

  const value = (parameter as Record<string, unknown>)[name];

  return typeof value === "string" ? value : undefined;
}

function getReferenceTextMimeType(event: unknown): ReferenceTextMimeType | undefined {
  const value = getWebAppParameter(event, WEB_APP_MIME_PARAMETER);

  if (value === undefined) {
    return undefined;
  }

  if (!REFERENCE_TEXT_MIME_TYPES.has(value as ReferenceTextMimeType)) {
    throw new Error(`Unknown reference TextOutput MIME type: ${value}`);
  }

  return value as ReferenceTextMimeType;
}

function configureReferenceTextOutput(output: unknown, event: unknown): unknown {
  if (output === null || (typeof output !== "object" && typeof output !== "function")) {
    throw new TypeError("Reference TextOutput must be an object");
  }

  const mimeTypeName = getReferenceTextMimeType(event);

  if (mimeTypeName !== undefined) {
    const globals = globalThis as unknown as Record<string, unknown>;

    const contentService = globals.ContentService;

    if (contentService === null || typeof contentService !== "object") {
      throw new Error("ContentService is unavailable");
    }

    const mimeType = (contentService as Record<string, unknown>).MimeType;

    if (mimeType === null || typeof mimeType !== "object") {
      throw new Error("ContentService.MimeType is unavailable");
    }

    const member = (mimeType as Record<string, unknown>)[mimeTypeName];

    const setMimeType = (output as Record<string, unknown>).setMimeType;

    if (typeof setMimeType !== "function") {
      throw new Error("TextOutput.setMimeType is unavailable");
    }

    Reflect.apply(setMimeType, output, [member]);
  }

  const fileName = getWebAppParameter(event, WEB_APP_FILE_NAME_PARAMETER);

  if (fileName !== undefined) {
    const downloadAsFile = (output as Record<string, unknown>).downloadAsFile;

    if (typeof downloadAsFile !== "function") {
      throw new Error("TextOutput.downloadAsFile is unavailable");
    }

    Reflect.apply(downloadAsFile, output, [fileName]);
  }

  return output;
}

function createReferenceReadinessValue(event: unknown):
  | {
      handled: false;
    }
  | {
      handled: true;
      value: unknown;
    } {
  if (getWebAppParameter(event, WEB_APP_READINESS_PARAMETER) !== "1") {
    return {
      handled: false,
    };
  }

  const provider = (globalThis as unknown as Record<string, unknown>)[REFERENCE_READINESS_FUNCTION];

  if (typeof provider !== "function") {
    throw new Error("Reference readiness revision provider is unavailable");
  }

  const revision = Reflect.apply(provider, globalThis, []);

  if (typeof revision !== "string") {
    throw new Error("Reference readiness revision provider must return a string");
  }

  return {
    handled: true,

    value: createReferenceTextOutput(revision),
  };
}

export function doPost(event: unknown) {
  if (
    event !== null &&
    typeof event === "object" &&
    (event as Record<string, unknown>).pathInfo === POST_DATA_SURFACE_PATH_INFO
  ) {
    return createJsonTextOutput(JSON.stringify(createPostDataObservation(event)));
  }

  const resultContract = createWebAppResultContractValue(event);

  if (resultContract.handled) {
    return resultContract.value;
  }

  return createJsonTextOutput(
    JSON.stringify(createWebAppEventObservation(event, arguments.length)),
  );
}

export function doPostDataSurface(event: unknown) {
  const eventRecord = event as Record<string, unknown>;

  const postData = eventRecord.postData;

  if (postData === null || typeof postData !== "object") {
    return createJsonTextOutput(
      JSON.stringify({
        present: false,
      }),
    );
  }

  const record = postData as Record<string, unknown>;

  function call(methodName: string) {
    const method = record[methodName];

    if (typeof method !== "function") {
      return {
        present: false,
        value: null,
      };
    }

    try {
      return {
        present: true,
        value: Reflect.apply(method, postData, []),
      };
    } catch (error) {
      return {
        present: true,
        error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
      };
    }
  }

  return createJsonTextOutput(
    JSON.stringify({
      present: true,
      type: typeof postData,
      tag: Object.prototype.toString.call(postData),
      prototypeIsObjectPrototype: Object.getPrototypeOf(postData) === Object.prototype,
      ownPropertyNames: Object.getOwnPropertyNames(postData).sort((a, b) => a.localeCompare(b)),
      properties: describeProperties(postData),
      fields: {
        contents: record.contents,
        length: record.length,
        name: record.name,
        type: record.type,
      },
      methods: {
        getName: call("getName"),
        getContentType: call("getContentType"),
        getDataAsString: call("getDataAsString"),
        getBytes: call("getBytes"),
        isGoogleType: call("isGoogleType"),
      },
    }),
  );
}
