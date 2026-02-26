// https://developers.google.com/apps-script/reference/url-fetch/http-response
export class HttpResponse implements GoogleAppsScript.URL_Fetch.HTTPResponse {
  readonly #headers: GoogleAppsScript.URL_Fetch.HttpHeaders;
  readonly #content: readonly GoogleAppsScript.Byte[];
  readonly #responseCode: GoogleAppsScript.Integer;

  constructor(
    headers: GoogleAppsScript.URL_Fetch.HttpHeaders,
    content: GoogleAppsScript.Byte[],
    responseCode: GoogleAppsScript.Integer,
  ) {
    this.#headers = headers;
    this.#content = content;
    this.#responseCode = responseCode;
  }

  getAllHeaders = () => {
    throw new Error("Method not implemented.");
  };
  getAs = (contentType: string) => {
    throw new Error("Method not implemented.");
  };
  getBlob = () => {
    throw new Error("Method not implemented.");
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
