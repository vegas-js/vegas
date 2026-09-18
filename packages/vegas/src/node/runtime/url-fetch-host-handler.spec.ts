import { describe, expect, test } from "vitest";

import {
  UrlFetchHostHandler,
  type UrlFetchCapability,
  type UrlFetchRequestValue,
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
    "set-cookie": ["a=1", "b=2"],
  },
  content: [66],
};

type RecordedUrlFetchCall =
  | {
      readonly operation: "fetch";
      readonly request: UrlFetchRequestValue;
    }
  | {
      readonly operation: "fetch-all";
      readonly requests: readonly UrlFetchRequestValue[];
    };

class RecordingUrlFetchCapability implements UrlFetchCapability {
  readonly calls: RecordedUrlFetchCall[] = [];

  async fetch(request: UrlFetchRequestValue): Promise<UrlFetchResponseValue> {
    this.calls.push({
      operation: "fetch",
      request,
    });
    return RESPONSE_A;
  }

  async fetchAll(
    requests: readonly UrlFetchRequestValue[],
  ): Promise<readonly UrlFetchResponseValue[]> {
    this.calls.push({
      operation: "fetch-all",
      requests,
    });
    return [RESPONSE_A, RESPONSE_B];
  }
}

describe("UrlFetchHostHandler", () => {
  test("delegate a single fetch to the injected capability", async () => {
    const capability = new RecordingUrlFetchCapability();
    const handler = new UrlFetchHostHandler(capability);
    const request = {
      url: "https://example.com",
      method: "post",
      payload: {
        kind: "text",
        value: "hello",
      },
    } as const satisfies UrlFetchRequestValue;

    await expect(
      handler.handle({
        service: "url-fetch",
        operation: "fetch",
        request,
      }),
    ).resolves.toStrictEqual(RESPONSE_A);

    expect(capability.calls).toStrictEqual([{ operation: "fetch", request }]);
  });

  test("preserve batch fetch as one capability operation", async () => {
    const capability = new RecordingUrlFetchCapability();
    const handler = new UrlFetchHostHandler(capability);
    const requests = [
      { url: "https://example.com/a" },
      { url: "https://example.com/b", method: "delete" },
    ] as const satisfies readonly UrlFetchRequestValue[];

    await expect(
      handler.handle({
        service: "url-fetch",
        operation: "fetch-all",
        requests,
      }),
    ).resolves.toStrictEqual([RESPONSE_A, RESPONSE_B]);

    expect(capability.calls).toStrictEqual([{ operation: "fetch-all", requests }]);
  });
});
