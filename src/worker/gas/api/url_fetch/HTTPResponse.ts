// https://developers.google.com/apps-script/reference/url-fetch/http-response
export function HttpResponse(
  headers: GoogleAppsScript.URL_Fetch.HttpHeaders,
  content: GoogleAppsScript.Byte[],
  responseCode: GoogleAppsScript.Integer,
): GoogleAppsScript.URL_Fetch.HTTPResponse {
  return {
    getAllHeaders: function () {
      throw new Error("Method not implemented.");
    },
    getAs: function (_contentType: string) {
      throw new Error("Method not implemented.");
    },
    getBlob: function () {
      throw new Error("Method not implemented.");
    },
    getContent: function () {
      return content;
    },
    getContentText: function (charset?: string) {
      const decoder = new TextDecoder(charset);
      return decoder.decode(Buffer.from(content));
    },
    getHeaders: function () {
      return headers;
    },
    getResponseCode: function () {
      return responseCode;
    },
  };
}
