interface DoGetResult {
  metaTags: { name: string; content: string }[];
  title: string;
  faviconUrl: string;
  content: string;
  xFrameOptionsMode: string;
}

export async function invokeScriptFunction(
  context: Record<string, unknown>,
  functionName: string,
  args: any[],
) {
  const targetFn = context[functionName];
  if (typeof targetFn !== "function") {
    throw new Error(`${functionName} is not a function`);
  }

  return await invokeFunction(targetFn, ...args);
}

export async function invokeFunction(fn: Function, ...args: any[]) {
  const result = await fn(...args);
  if (fn.name === "doGet") {
    return {
      metaTags: result.getMetaTags().map((metaTag: any) => {
        return { name: metaTag.getName(), content: metaTag.getContent() };
      }),
      title: result.getTitle(),
      faviconUrl: result.getFaviconUrl(),
      content: result.getContent(),
      xFrameOptionsMode: (result as any).getXFrameOptionsMode(),
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
