// https://developers.google.com/apps-script/reference/url-fetch/http-response
export class GASHttpResponse implements GoogleAppsScript.URL_Fetch.HTTPResponse {
  readonly #headers: GoogleAppsScript.URL_Fetch.HttpHeaders;
  readonly #content: GoogleAppsScript.Byte[];
  readonly #responseCode: GoogleAppsScript.Integer;

  constructor(response: any) {
    this.#headers = response.headers;
    this.#content = response.content;
    this.#responseCode = response.responseCode;
  }

  getAllHeaders = () => {
    throw new Error("Method not implemented.");
  };
  getAs = (_contentType: string) => {
    throw new Error("Method not implemented.");
  };
  getBlob = () => {
    throw new Error("Method not implemented.");
  };
  getContent = () => {
    return this.#content;
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
