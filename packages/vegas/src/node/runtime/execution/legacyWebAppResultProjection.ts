interface LegacyDoGetResult {
  metaTags: Array<{
    name: string;
    content: string;
  }>;
  title: string;
  faviconUrl: string | null;
  content: string;
  xFrameOptionsMode: string | null | undefined;
}

interface LegacyDoPostResult {
  mimeType: string;
  content: string;
}

export interface LegacyWebAppResultProjectionAdapters {
  getHtmlOutputXFrameOptionsMode(value: unknown): string | null | undefined;
}

const defaultAdapters: LegacyWebAppResultProjectionAdapters = {
  getHtmlOutputXFrameOptionsMode(value) {
    const method = getRequiredMethod(
      value,
      "getXFrameOptionsMode",
      "HtmlOutput#getXFrameOptionsMode() is unavailable.",
    );

    return Reflect.apply(method, value, []) as string | null | undefined;
  },
};

export function projectLegacyWebAppResult(
  functionName: string,
  result: unknown,
  adapters: LegacyWebAppResultProjectionAdapters = defaultAdapters,
): unknown {
  if (functionName === "doGet") {
    return projectDoGetResult(result, adapters);
  }

  if (functionName === "doPost") {
    return projectDoPostResult(result);
  }

  return result;
}

function projectDoGetResult(
  result: unknown,
  adapters: LegacyWebAppResultProjectionAdapters,
): LegacyDoGetResult {
  const metaTags = callRequiredMethod(result, "getMetaTags");

  if (!Array.isArray(metaTags)) {
    throw new TypeError("HtmlOutput#getMetaTags() must return an array.");
  }

  return {
    metaTags: metaTags.map((metaTag) => ({
      name: requireString(callRequiredMethod(metaTag, "getName"), "HtmlOutput meta tag name"),
      content: requireString(
        callRequiredMethod(metaTag, "getContent"),
        "HtmlOutput meta tag content",
      ),
    })),
    title: requireString(callRequiredMethod(result, "getTitle"), "HtmlOutput title"),
    faviconUrl: requireNullableString(
      callRequiredMethod(result, "getFaviconUrl"),
      "HtmlOutput favicon URL",
    ),
    content: requireString(callRequiredMethod(result, "getContent"), "HtmlOutput content"),
    xFrameOptionsMode: adapters.getHtmlOutputXFrameOptionsMode(result),
  };
}

function projectDoPostResult(result: unknown): LegacyDoPostResult {
  const mimeTypeMethod = getOptionalMethod(result, "getMimeType");

  return {
    mimeType:
      mimeTypeMethod === undefined
        ? "text/html"
        : requireString(Reflect.apply(mimeTypeMethod, result, []), "doPost MIME type"),
    content: requireString(callRequiredMethod(result, "getContent"), "doPost content"),
  };
}

function callRequiredMethod(value: unknown, name: string): unknown {
  const method = getRequiredMethod(value, name, `${name}() is unavailable.`);

  return Reflect.apply(method, value, []);
}

function getRequiredMethod(value: unknown, name: string, message: string): CallableFunction {
  const method = getOptionalMethod(value, name);

  if (method === undefined) {
    throw new TypeError(message);
  }

  return method;
}

function getOptionalMethod(value: unknown, name: string): CallableFunction | undefined {
  if (value === null || (typeof value !== "object" && typeof value !== "function")) {
    return undefined;
  }

  const method = Reflect.get(value, name);

  return typeof method === "function" ? method : undefined;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new TypeError(`${label} must be a string.`);
  }

  return value;
}

function requireNullableString(value: unknown, label: string): string | null {
  if (value === null) {
    return null;
  }

  return requireString(value, label);
}
