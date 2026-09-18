import { describe, expect, test } from "vitest";

import {
  createBlob,
  createUrlFetchApp,
  HTTPResponse,
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

    if (call.service !== "url-fetch") {
      throw new Error(`unexpected host service: ${call.service}`);
    }

    switch (call.operation) {
      case "fetch":
        return RESPONSE_A as HostCallResult<C>;
      case "fetch-all":
        return [RESPONSE_A, RESPONSE_B] as unknown as HostCallResult<C>;
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
});
