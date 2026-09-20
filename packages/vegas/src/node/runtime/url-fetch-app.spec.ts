import { describe, expect, test } from "vitest";

import {
  createBlob,
  createUrlFetchApp,
  HTTPResponse,
  RuntimeBlob,
  UrlFetchApp,
  type HostBridge,
  type HostCall,
  type HostCallResult,
  type UrlFetchResponseValue,
} from "./index";

const RESPONSE_A: UrlFetchResponseValue = {
  statusCode: 200,
  headers: {
    "content-type": "text/plain",
  },
  content: [65],
};

const RESPONSE_B: UrlFetchResponseValue = {
  statusCode: 201,
  headers: {
    "content-type": "application/json",
  },
  content: [66],
};

class RecordingHostBridge implements HostBridge {
  readonly calls: HostCall[] = [];

  call<C extends HostCall>(call: C): HostCallResult<C> {
    this.calls.push(call);

    switch (call.service) {
      case "blob":
        return {
          ...call.value,
          bytes: [80, 68, 70],
          contentType: call.contentType,
        } as unknown as HostCallResult<C>;
      case "url-fetch": {
        switch (call.operation) {
          case "fetch":
            return RESPONSE_A as HostCallResult<C>;
          case "fetch-all":
            return [RESPONSE_A, RESPONSE_B] as unknown as HostCallResult<C>;
        }
      }
      default:
        throw new Error(`unexpected host service: ${call.service}`);
    }
  }
}

describe("UrlFetchApp", () => {
  test("map fetch to one semantic host call and hydrate the response", () => {
    const bridge = new RecordingHostBridge();
    const urlFetch = createUrlFetchApp(bridge);

    expect(urlFetch).toBeInstanceOf(UrlFetchApp);

    const response = urlFetch.fetch("https://example.com/upload", {
      method: "post",
      headers: {
        Authorization: "Bearer token",
      },
      payload: createBlob("Vegas", "text/plain", "vegas.txt"),
      timeoutSeconds: 30,
    });

    expect(response).toBeInstanceOf(HTTPResponse);
    expect(response.getResponseCode()).toBe(200);
    expect(response.getContent()).toStrictEqual([65]);
    expect(bridge.calls).toStrictEqual([
      {
        service: "url-fetch",
        operation: "fetch",
        request: {
          url: "https://example.com/upload",
          headers: {
            Authorization: "Bearer token",
          },
          method: "post",
          payload: {
            kind: "blob",
            value: {
              bytes: [86, 101, 103, 97, 115],
              contentType: "text/plain",
              name: "vegas.txt",
              googleType: false,
            },
          },
          timeoutSeconds: 30,
        },
      },
    ]);
  });

  test("propagate Blob conversion to fetched responses", () => {
    const bridge = new RecordingHostBridge();
    const response = createUrlFetchApp(bridge).fetch("https://example.com");

    const converted = response.getAs("application/pdf");

    expect(converted.getBytes()).toStrictEqual([80, 68, 70]);
    expect(converted.getContentType()).toBe("application/pdf");
    expect(bridge.calls).toStrictEqual([
      {
        service: "url-fetch",
        operation: "fetch",
        request: {
          url: "https://example.com",
        },
      },
      {
        service: "blob",
        operation: "convert",
        value: {
          bytes: [65],
          contentType: null,
          name: null,
          googleType: false,
        },
        contentType: "application/pdf",
      },
    ]);
  });

  test("preserve fetchAll as one host call and hydrate responses in input order", () => {
    const bridge = new RecordingHostBridge();
    const urlFetch = createUrlFetchApp(bridge);

    const responses = urlFetch.fetchAll([
      "https://example.com/a",
      {
        url: "https://example.com/b",
        method: "post",
        payload: {
          name: "Vegas",
          attachment: createBlob("Hi", "text/plain", "hello.txt"),
        },
      },
    ]);

    expect(responses).toHaveLength(2);
    expect(responses[0]).toBeInstanceOf(HTTPResponse);
    expect(responses[1]).toBeInstanceOf(HTTPResponse);
    expect(responses.map((response) => response.getResponseCode())).toStrictEqual([200, 201]);
    expect(bridge.calls).toStrictEqual([
      {
        service: "url-fetch",
        operation: "fetch-all",
        requests: [
          {
            url: "https://example.com/a",
          },
          {
            url: "https://example.com/b",
            method: "post",
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
          },
        ],
      },
    ]);
  });

  test("build getRequest locally with the documented minimum fields", () => {
    const bridge = new RecordingHostBridge();
    const urlFetch = createUrlFetchApp(bridge);

    expect(urlFetch.getRequest("https://example.com")).toStrictEqual({
      url: "https://example.com",
      method: "get",
      contentType: "application/x-www-form-urlencoded",
      payload: undefined,
      headers: {},
    });
    expect(bridge.calls).toStrictEqual([]);
  });

  test("preserve explicit getRequest values without exposing mutable inputs", () => {
    const bridge = new RecordingHostBridge();
    const urlFetch = createUrlFetchApp(bridge);
    const headers = {
      Authorization: "Bearer token",
    };
    const payload = [65, 66, 67];

    const request = urlFetch.getRequest("https://example.com/upload", {
      method: "put",
      contentType: "application/octet-stream",
      headers,
      payload,
    });

    expect(request).toStrictEqual({
      url: "https://example.com/upload",
      method: "put",
      contentType: "application/octet-stream",
      payload: [65, 66, 67],
      headers: {
        Authorization: "Bearer token",
      },
    });

    headers.Authorization = "changed";
    payload[0] = 90;

    expect(request.headers).toStrictEqual({
      Authorization: "Bearer token",
    });
    expect(request.payload).toStrictEqual([65, 66, 67]);
    expect(bridge.calls).toStrictEqual([]);
  });

  test("use multipart form content type and clone Blob fields in getRequest", () => {
    const bridge = new RecordingHostBridge();
    const urlFetch = createUrlFetchApp(bridge);
    const attachment = createBlob("Hi", "text/plain", "hello.txt");

    const request = urlFetch.getRequest("https://example.com/form", {
      method: "post",
      payload: {
        name: "Vegas",
        attachment,
      },
    });

    expect(request.method).toBe("post");
    expect(request.contentType).toBe("multipart/form-data");

    const requestPayload = request.payload;
    if (
      requestPayload === undefined ||
      typeof requestPayload !== "object" ||
      !("attachment" in requestPayload)
    ) {
      throw new Error("expected form payload");
    }

    const requestAttachment = requestPayload.attachment;
    expect(requestAttachment).toBeInstanceOf(RuntimeBlob);

    if (!(requestAttachment instanceof RuntimeBlob)) {
      throw new Error("expected Blob form field");
    }

    attachment.setBytes([90]);

    expect(requestAttachment).not.toBe(attachment);
    expect(requestAttachment.getBytes()).toStrictEqual([72, 105]);
    expect(bridge.calls).toStrictEqual([]);
  });
});
