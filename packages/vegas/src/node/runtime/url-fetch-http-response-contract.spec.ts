import { describe, expect, test } from "vitest";

import type { BlobConverter } from "./blob-converter";
import { RuntimeBlob, hydrateHttpResponse, type UrlFetchResponseValue } from "./index";

const RESPONSE: UrlFetchResponseValue = {
  statusCode: 206,
  headers: {
    "content-type": "text/plain",
    "set-cookie": ["a=1", "b=2"],
  },
  content: [86, 101, 103, 97, 115],
};

// Public contract:
// https://developers.google.com/apps-script/reference/url-fetch/http-response
describe("HTTPResponse public contract", () => {
  test("expose response headers in the documented single- and multi-value forms", () => {
    const response = hydrateHttpResponse(RESPONSE);

    expect(response.getAllHeaders()).toStrictEqual({
      "content-type": "text/plain",
      "set-cookie": ["a=1", "b=2"],
    });

    const singleValueHeaders = hydrateHttpResponse({
      statusCode: 200,
      headers: {
        "content-type": "application/json",
        "x-request-id": "request-1",
      },
      content: [],
    });

    // Google documents getHeaders() as a header map but does not define how duplicate values are
    // reduced. The contract test therefore uses only single-valued response headers.
    expect(singleValueHeaders.getHeaders()).toStrictEqual({
      "content-type": "application/json",
      "x-request-id": "request-1",
    });
  });

  test("expose the response body as Blob, bytes, text, and an HTTP status code", () => {
    const response = hydrateHttpResponse(RESPONSE);

    const blob = response.getBlob();

    expect(blob).toBeInstanceOf(RuntimeBlob);
    expect(blob.getBytes()).toStrictEqual([86, 101, 103, 97, 115]);
    expect(response.getContent()).toStrictEqual([86, 101, 103, 97, 115]);
    expect(response.getContentText()).toBe("Vegas");
    expect(response.getResponseCode()).toBe(206);

    const utf8Response = hydrateHttpResponse({
      statusCode: 200,
      headers: {},
      content: [86, 101, 103, 97, 115, 32, -29, -126, -80],
    });

    expect(utf8Response.getContentText("UTF-8")).toBe("Vegas グ");
  });

  test("convert response data to the requested Blob content type when conversion is available", () => {
    const convert: BlobConverter = (value, contentType) => ({
      ...value,
      bytes: [80, 68, 70],
      contentType,
    });
    const response = hydrateHttpResponse(RESPONSE, convert);

    const blob = response.getAs("application/pdf");

    expect(blob).toBeInstanceOf(RuntimeBlob);
    expect(blob.getBytes()).toStrictEqual([80, 68, 70]);
    expect(blob.getContentType()).toBe("application/pdf");
  });
});
