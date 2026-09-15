// https://developers.google.com/apps-script/guides/web
interface GasWebAppEventBase {
  readonly queryString: string | null;
  readonly parameter: Readonly<Record<string, string>>;
  readonly parameters: Readonly<Record<string, readonly string[]>>;
  readonly contextPath: "";
  readonly pathInfo?: string;
}

export interface GasDoGetEvent extends GasWebAppEventBase {
  readonly contentLength: -1;
}

export interface GasPostData {
  readonly length: number;
  readonly type: string | undefined;
  readonly contents: string;
  readonly name: "postData";
}

export interface GasDoPostEvent extends GasWebAppEventBase {
  readonly contentLength: number;
  readonly postData: GasPostData;
}

function createBaseEvent(url: URL): GasWebAppEventBase {
  const queryString = url.search.length > 1 ? url.search.slice(1) : null;

  const parameter: Record<string, string> = {};
  const parameters: Record<string, string[]> = {};

  for (const [key, value] of url.searchParams) {
    if (!Object.hasOwn(parameter, key)) {
      parameter[key] = value;
    }

    parameters[key] ??= [];
    parameters[key].push(value);
  }

  const trimmedPath = url.pathname.replace(/^\/(exec|dev)/, "");
  const pathInfo = trimmedPath.length !== 0 ? trimmedPath.slice(1) : undefined;

  return {
    queryString,
    parameter,
    parameters,
    contextPath: "",
    ...(pathInfo ? { pathInfo } : {}),
  };
}

export function createGasDoGetEvent(url: URL): GasDoGetEvent {
  return {
    ...createBaseEvent(url),
    contentLength: -1,
  };
}

export function createGasDoPostEvent(
  url: URL,
  body: string,
  contentType: string | undefined,
): GasDoPostEvent {
  const contentLength = new Blob([body]).size;

  return {
    ...createBaseEvent(url),
    contentLength,
    postData: {
      length: contentLength,
      type: contentType?.replace(/;.*$/, ""),
      contents: body,
      name: "postData",
    },
  };
}
