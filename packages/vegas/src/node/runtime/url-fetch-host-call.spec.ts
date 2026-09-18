import { describe, expect, expectTypeOf, test } from "vitest";

import type { UrlFetchHostCallResult, UrlFetchRequestValue, UrlFetchResponseValue } from "./index";

describe("UrlFetch host contract", () => {
  test("represent documented request options with structured-clone-safe values", () => {
    const request: UrlFetchRequestValue = {
      url: "https://example.com/api",
      method: "post",
      contentType: "multipart/form-data",
      headers: {
        Authorization: "Bearer token",
      },
      payload: {
        kind: "form",
        fields: {
          name: "Vegas",
          attachment: {
            bytes: [72, 105],
            contentType: "text/plain",
            name: "hello.txt",
            googleType: false,
          },
        },
      },
      useIntranet: false,
      validateHttpsCertificates: true,
      followRedirects: true,
      muteHttpExceptions: false,
      escaping: true,
      timeoutSeconds: 30,
    };

    expect(structuredClone(request)).toStrictEqual(request);
  });

  test("map single and batch fetch calls to response values", () => {
    const singleCall = {
      service: "url-fetch",
      operation: "fetch",
      request: {
        url: "https://example.com",
      },
    } as const;
    const batchCall = {
      service: "url-fetch",
      operation: "fetch-all",
      requests: [
        {
          url: "https://example.com/a",
        },
        {
          url: "https://example.com/b",
        },
      ],
    } as const;

    expectTypeOf<
      UrlFetchHostCallResult<typeof singleCall>
    >().toEqualTypeOf<UrlFetchResponseValue>();
    expectTypeOf<UrlFetchHostCallResult<typeof batchCall>>().toEqualTypeOf<
      readonly UrlFetchResponseValue[]
    >();
  });
});
