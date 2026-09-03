interface DoGetResult {
  metaTags: { name: string; content: string }[];
  title: string;
  faviconUrl: string;
  content: string;
  xFrameOptionsMode: string | null | undefined;
}

export interface InvocationAdapters {
  getHtmlOutputXFrameOptionsMode(value: unknown): string | null | undefined;
}

const defaultInvocationAdapters: InvocationAdapters = {
  getHtmlOutputXFrameOptionsMode(value) {
    if (value === null || (typeof value !== "object" && typeof value !== "function")) {
      throw new TypeError("Expected an HtmlOutput value.");
    }

    const method = (
      value as {
        getXFrameOptionsMode?: unknown;
      }
    ).getXFrameOptionsMode;

    if (typeof method !== "function") {
      throw new TypeError("HtmlOutput#getXFrameOptionsMode() is unavailable.");
    }

    return Reflect.apply(method, value, []) as string | null | undefined;
  },
};

export async function invokeScriptFunction(
  context: Record<string, unknown>,
  functionName: string,
  args: any[],
  adapters: InvocationAdapters = defaultInvocationAdapters,
) {
  const targetFn = context[functionName];
  if (typeof targetFn !== "function") {
    throw new Error(`${functionName} is not a function`);
  }

  return await invokeFunctionWithAdapters(targetFn, args, adapters);
}

export async function invokeFunction(fn: Function, ...args: any[]) {
  return invokeFunctionWithAdapters(fn, args, defaultInvocationAdapters);
}

async function invokeFunctionWithAdapters(fn: Function, args: any[], adapters: InvocationAdapters) {
  const result = await fn(...args);
  if (fn.name === "doGet") {
    return {
      metaTags: result.getMetaTags().map((metaTag: any) => {
        return { name: metaTag.getName(), content: metaTag.getContent() };
      }),
      title: result.getTitle(),
      faviconUrl: result.getFaviconUrl(),
      content: result.getContent(),
      xFrameOptionsMode: adapters.getHtmlOutputXFrameOptionsMode(result),
    } satisfies DoGetResult;
  }

  if (fn.name === "doPost") {
    return {
      mimeType: typeof result.getMimeType === "function" ? result.getMimeType() : "text/html",
      content: result.getContent(),
    };
  }

  return result;
}
