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

  getAllHeaders(): object {
    throw new Error("Method not implemented.");
  }
  getAs(_contentType: string): GoogleAppsScript.Base.Blob {
    throw new Error("Method not implemented.");
  }
  getBlob(): GoogleAppsScript.Base.Blob {
    throw new Error("Method not implemented.");
  }
  getContent(): GoogleAppsScript.Byte[] {
    return this.#content;
  }
  getContentText(charset?: string): string {
    const decoder = new TextDecoder(charset);
    return decoder.decode(Buffer.from(this.#content));
  }
  getHeaders(): GoogleAppsScript.URL_Fetch.HttpHeaders {
    return this.#headers;
  }
  getResponseCode(): GoogleAppsScript.Integer {
    return this.#responseCode;
  }
}
