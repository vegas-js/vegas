import { describe, expect, test } from "vitest";

import {
  createBlob,
  normalizeUrlFetchRequest,
  type UrlFetchRequestInput,
  type UrlFetchRequestOptionsInput,
} from "./index";

describe("normalizeUrlFetchRequest", () => {
  test("normalize a URL string without inventing optional request values", () => {
    expect(normalizeUrlFetchRequest("https://example.com")).toStrictEqual({
      url: "https://example.com",
    });
  });

  test("copy documented request options into the transport value", () => {
    const headers = {
      Authorization: "Bearer token",
    };
    const options: UrlFetchRequestOptionsInput = {
      contentType: "application/json",
      headers,
      method: "post",
      payload: '{"name":"Vegas"}',
      useIntranet: false,
      validateHttpsCertificates: true,
      followRedirects: false,
      muteHttpExceptions: true,
      escaping: false,
      timeoutSeconds: 30,
    };

    const request = normalizeUrlFetchRequest("https://example.com/api", options);

    expect(request).toStrictEqual({
      url: "https://example.com/api",
      contentType: "application/json",
      headers: {
        Authorization: "Bearer token",
      },
      method: "post",
      payload: {
        kind: "text",
        value: '{"name":"Vegas"}',
      },
      useIntranet: false,
      validateHttpsCertificates: true,
      followRedirects: false,
      muteHttpExceptions: true,
      escaping: false,
      timeoutSeconds: 30,
    });

    headers.Authorization = "changed";
    expect(request.headers).toStrictEqual({
      Authorization: "Bearer token",
    });
  });

  test("normalize byte array and Blob payloads without crossing the host boundary as objects", () => {
    expect(
      normalizeUrlFetchRequest("https://example.com/bytes", {
        method: "post",
        payload: [65, 66, 67],
      }),
    ).toMatchObject({
      payload: {
        kind: "bytes",
        value: [65, 66, 67],
      },
    });

    expect(
      normalizeUrlFetchRequest("https://example.com/blob", {
        method: "post",
        payload: createBlob("Vegas", "text/plain", "vegas.txt"),
      }),
    ).toMatchObject({
      payload: {
        kind: "blob",
        value: {
          bytes: [86, 101, 103, 97, 115],
          contentType: "text/plain",
          name: "vegas.txt",
          googleType: false,
        },
      },
    });
  });

  test("normalize form data and serialize Blob fields", () => {
    expect(
      normalizeUrlFetchRequest("https://example.com/form", {
        method: "post",
        payload: {
          name: "Vegas",
          attachment: createBlob("Hi", "text/plain", "hello.txt"),
        },
      }),
    ).toMatchObject({
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
    });
  });

  test("normalize fetchAll request objects and keep the input immutable", () => {
    const input: UrlFetchRequestInput = {
      url: "https://example.com",
      headers: {
        Accept: "application/json",
      },
    };

    const request = normalizeUrlFetchRequest(input);

    expect(request).toStrictEqual({
      url: "https://example.com",
      headers: {
        Accept: "application/json",
      },
    });
    expect(request).not.toBe(input);
    expect(request.headers).not.toBe(input.headers);
  });
});
