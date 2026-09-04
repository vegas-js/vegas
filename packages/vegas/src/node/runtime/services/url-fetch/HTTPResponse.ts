import { Blob } from "../base/Blob";

function toGasByte(value: number): number {
  const unsigned = value & 0xff;

  return unsigned > 0x7f ? unsigned - 0x100 : unsigned;
}

function getHeaderValue(
  headers: GoogleAppsScript.URL_Fetch.HttpHeaders,
  expectedName: string,
): string | null {
  const expectedLowerCase = expectedName.toLowerCase();

  for (const [name, rawValue] of Object.entries(headers)) {
    if (name.toLowerCase() !== expectedLowerCase) {
      continue;
    }

    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;

    return value === undefined || value === null ? null : String(value);
  }

  return null;
}

function getResponseMediaType(headers: GoogleAppsScript.URL_Fetch.HttpHeaders): string | null {
  const contentType = getHeaderValue(headers, "Content-Type");

  if (contentType === null) {
    return null;
  }

  return contentType.split(";", 1)[0].trim().toLowerCase() || null;
}

function getUrlBasename(sourceUrl: string): string {
  if (!sourceUrl) {
    return "";
  }

  try {
    const url = new URL(sourceUrl);

    const pathnameParts = url.pathname.split("/").filter(Boolean);

    const basename = pathnameParts.at(-1) ?? "";

    try {
      return decodeURIComponent(basename);
    } catch {
      return basename;
    }
  } catch {
    return "";
  }
}

function createBlobName(sourceUrl: string, mediaType: string | null): string {
  let name = getUrlBasename(sourceUrl);

  /*
   * The characterized GAS HTTPResponse behavior appends .txt for
   * text/plain resources whose URL path has no .txt extension.
   */
  if (mediaType === "text/plain" && name !== "" && !name.toLowerCase().endsWith(".txt")) {
    name += ".txt";
  }

  return name;
}

// https://developers.google.com/apps-script/reference/url-fetch/http-response
export class HttpResponse implements GoogleAppsScript.URL_Fetch.HTTPResponse {
  readonly #headers: GoogleAppsScript.URL_Fetch.HttpHeaders;
  readonly #content: readonly GoogleAppsScript.Byte[];
  readonly #responseCode: GoogleAppsScript.Integer;
  readonly #sourceUrl: string;

  constructor(
    headers: GoogleAppsScript.URL_Fetch.HttpHeaders,
    content: GoogleAppsScript.Byte[],
    responseCode: GoogleAppsScript.Integer,
    sourceUrl: string = "",
  ) {
    this.#headers = headers;
    this.#content = content.map(toGasByte);
    this.#responseCode = responseCode;
    this.#sourceUrl = sourceUrl;
  }

  getAllHeaders = () => {
    throw new Error("Method not implemented.");
  };
  getAs = (contentType: string) => {
    throw new Error("Method not implemented.");
  };
  getBlob = () => {
    const mediaType = getResponseMediaType(this.#headers);

    const blob = new Blob(createBlobName(this.#sourceUrl, mediaType)).setBytes(
      Array.from(this.#content),
    );

    if (mediaType !== null) {
      blob.setContentType(mediaType);
    }

    return blob;
  };
  getContent = () => {
    return Array.from(this.#content);
  };
  getContentText = (charset?: string) => {
    const decoder = new TextDecoder(charset);
    return decoder.decode(Buffer.from(this.#content));
  };
  getHeaders = () => {
    return this.#headers;
  };
  getResponseCode = () => {
    return this.#responseCode;
  };
}
