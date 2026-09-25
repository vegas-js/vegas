import { describe, expect, test } from "vitest";

import {
  createUrlFetchApp,
  HTTPResponse,
  type HostBridge,
  type HostCall,
  type HostCallResult,
  type UrlFetchResponseValue,
} from "./index";

const FIRST_RESPONSE: UrlFetchResponseValue = {
  statusCode: 200,
  headers: {
    "content-type": "text/plain",
  },
  content: [65],
};

const SECOND_RESPONSE: UrlFetchResponseValue = {
  statusCode: 201,
  headers: {
    "content-type": "text/plain",
  },
  content: [66],
};

class ContractHostBridge implements HostBridge {
  readonly calls: HostCall[] = [];

  call<C extends HostCall>(call: C): HostCallResult<C> {
    this.calls.push(call);

    if (call.service !== "url-fetch") {
      throw new Error(`unexpected host service: ${call.service}`);
    }

    switch (call.operation) {
      case "fetch":
        return FIRST_RESPONSE as HostCallResult<C>;
      case "fetch-all":
        return [FIRST_RESPONSE, SECOND_RESPONSE] as unknown as HostCallResult<C>;
    }
  }
}

// Public contract:
// https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app
describe("UrlFetchApp public contract", () => {
  test("fetch one URL with advanced request parameters and return an HTTPResponse", () => {
    const bridge = new ContractHostBridge();
    const urlFetch = createUrlFetchApp(bridge);

    const response = urlFetch.fetch("https://example.com/items", {
      method: "post",
      headers: {
        Authorization: "Bearer token",
      },
      payload: "name=Vegas",
    });

    expect(response).toBeInstanceOf(HTTPResponse);
    expect(response.getResponseCode()).toBe(200);

    // HostBridge is Vegas's local substitute for external HTTP transport. Only documented request
    // fields are asserted here; Google network infrastructure is intentionally not modeled.
    expect(bridge.calls).toHaveLength(1);
    expect(bridge.calls[0]).toMatchObject({
      service: "url-fetch",
      operation: "fetch",
      request: {
        url: "https://example.com/items",
        method: "post",
        headers: {
          Authorization: "Bearer token",
        },
      },
    });
  });

  test("fetch multiple URL requests and return responses in request order", () => {
    const bridge = new ContractHostBridge();
    const urlFetch = createUrlFetchApp(bridge);

    const responses = urlFetch.fetchAll([
      "https://example.com/first",
      {
        url: "https://example.com/second",
        method: "post",
      },
    ]);

    expect(responses).toHaveLength(2);
    expect(responses.every((response) => response instanceof HTTPResponse)).toBe(true);
    expect(responses.map((response) => response.getResponseCode())).toStrictEqual([200, 201]);

    expect(bridge.calls[0]).toMatchObject({
      service: "url-fetch",
      operation: "fetch-all",
      requests: [
        {
          url: "https://example.com/first",
        },
        {
          url: "https://example.com/second",
          method: "post",
        },
      ],
    });
  });

  test("return the request preview without issuing the request", () => {
    const bridge = new ContractHostBridge();
    const urlFetch = createUrlFetchApp(bridge);

    const request = urlFetch.getRequest("https://example.com/items", {
      method: "put",
      contentType: "text/plain",
      headers: {
        "X-Vegas": "contract",
      },
      payload: "Vegas",
    });

    expect(request).toEqual(
      expect.objectContaining({
        url: "https://example.com/items",
        method: "put",
        contentType: "text/plain",
        payload: "Vegas",
        headers: {
          "X-Vegas": "contract",
        },
      }),
    );
    expect(bridge.calls).toStrictEqual([]);
  });
});
