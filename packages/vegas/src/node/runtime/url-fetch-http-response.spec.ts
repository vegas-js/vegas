import { describe, expect, test } from "vitest";

import type { BlobConverter } from "./blob-converter";
import {
  HTTPResponse,
  RuntimeBlob,
  hydrateHttpResponse,
  type UrlFetchResponseValue,
} from "./index";
import { UnsupportedRuntimeOperationError } from "./unsupported-runtime-operation-error";

function createResponseValue(): UrlFetchResponseValue {
  return {
    statusCode: 206,
    headers: {
      "content-type": "application/octet-stream",
      "set-cookie": ["a=1", "b=2"],
    },
    content: [65, 66, 67],
  };
}

describe("HTTPResponse", () => {
  test("expose response code and defensive copies of content", () => {
    const value = createResponseValue();
    const response = hydrateHttpResponse(value);

    expect(response).toBeInstanceOf(HTTPResponse);
    expect(response.getResponseCode()).toBe(206);
    expect(response.getContent()).toStrictEqual([65, 66, 67]);

    const content = response.getContent();
    content[0] = 90;

    expect(response.getContent()).toStrictEqual([65, 66, 67]);
  });

  test("preserve all response header values without exposing internal arrays", () => {
    const response = hydrateHttpResponse(createResponseValue());

    expect(response.getAllHeaders()).toStrictEqual({
      "content-type": "application/octet-stream",
      "set-cookie": ["a=1", "b=2"],
    });

    const headers = response.getAllHeaders();
    const cookies = headers["set-cookie"];

    if (!Array.isArray(cookies)) {
      throw new Error("expected set-cookie to contain multiple values");
    }

    cookies[0] = "changed=1";

    expect(response.getAllHeaders()).toStrictEqual({
      "content-type": "application/octet-stream",
      "set-cookie": ["a=1", "b=2"],
    });
  });

  test("return one value per response header without exposing internal state", () => {
    const response = hydrateHttpResponse({
      statusCode: 200,
      headers: {
        "content-type": "text/plain",
        "set-cookie": ["a=1", "b=2"],
        "x-empty": [],
      },
      content: [],
    });

    const headers = response.getHeaders();

    expect(headers).toStrictEqual({
      "content-type": "text/plain",
      "set-cookie": "a=1",
    });

    headers["set-cookie"] = "changed=1";
    expect(response.getHeaders()).toStrictEqual({
      "content-type": "text/plain",
      "set-cookie": "a=1",
    });
    expect(response.getAllHeaders()).toStrictEqual({
      "content-type": "text/plain",
      "set-cookie": ["a=1", "b=2"],
      "x-empty": [],
    });
  });

  test("convert response content through the bound Blob converter", () => {
    const convert: BlobConverter = (value, contentType) => ({
      ...value,
      bytes: [80, 68, 70],
      contentType,
    });
    const response = hydrateHttpResponse(createResponseValue(), convert);

    const converted = response.getAs("application/pdf");

    expect(converted).toBeInstanceOf(RuntimeBlob);
    expect(converted.getBytes()).toStrictEqual([80, 68, 70]);
    expect(converted.getContentType()).toBe("application/pdf");
    expect(response.getBlob().getAs("application/pdf").getBytes()).toStrictEqual([80, 68, 70]);
  });

  test("reject conversion without a bound Runtime conversion context", () => {
    const response = hydrateHttpResponse(createResponseValue());

    expect(() => response.getAs("application/pdf")).toThrow(UnsupportedRuntimeOperationError);
    expect(() => response.getAs("application/pdf")).toThrow(
      "Local Runtime does not support HTTPResponse.getAs(): Blob conversion is not available in this Runtime context.",
    );
  });

  test("create an independent Blob for the response body", () => {
    const response = hydrateHttpResponse(createResponseValue());
    const blob = response.getBlob();

    expect(blob).toBeInstanceOf(RuntimeBlob);
    expect(blob.getBytes()).toStrictEqual([65, 66, 67]);
    expect(blob.getContentType()).toBeNull();
    expect(blob.getName()).toBeNull();

    blob.setBytes([90]);

    expect(response.getContent()).toStrictEqual([65, 66, 67]);
    expect(response.getBlob().getBytes()).toStrictEqual([65, 66, 67]);
  });

  test("decode zero-argument content text as the local UTF-8 default", () => {
    const response = hydrateHttpResponse({
      statusCode: 200,
      headers: {},
      content: [86, 101, 103, 97, 115, 32, -29, -126, -80],
    });

    expect(response.getContentText()).toBe("Vegas グ");
    expect(response.getContentText()).toBe(response.getContentText("UTF-8"));
  });

  test("decode content with the explicitly requested charset", () => {
    const response = hydrateHttpResponse({
      statusCode: 200,
      headers: {},
      content: [86, 0, 101, 0, 103, 0, 97, 0, 115, 0],
    });

    expect(response.getContentText("UTF-16LE")).toBe("Vegas");
  });

  test("reject unsupported explicit charsets", () => {
    const response = hydrateHttpResponse(createResponseValue());

    expect(() => response.getContentText("not-a-real-charset")).toThrow();
  });

  test("snapshot the transport value at hydration time", () => {
    const value = createResponseValue();
    const response = hydrateHttpResponse(value);

    (value.content as number[])[0] = 90;
    const cookies = value.headers["set-cookie"];
    if (Array.isArray(cookies)) {
      (cookies as string[])[0] = "changed=1";
    }

    expect(response.getContent()).toStrictEqual([65, 66, 67]);
    expect(response.getAllHeaders()).toStrictEqual({
      "content-type": "application/octet-stream",
      "set-cookie": ["a=1", "b=2"],
    });
  });
});
