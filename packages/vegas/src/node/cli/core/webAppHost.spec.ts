import type { IncomingMessage, ServerResponse } from "node:http";

import { describe, expect, test, vi } from "vitest";

import type { WebAppTriggerRequest } from "../../runtime/triggers/webApp";
import type { WebAppResult } from "../../runtime/triggers/webAppResult";
import { handleWebAppHttpRequest } from "./webAppHost";

interface RecordedResponse {
  statusCode: number;

  statusMessage: string;

  readonly headers: Map<string, string>;

  body: string;
}

function createRequest(
  method: string,
  options: {
    readonly body?: string;

    readonly headers?: Record<string, string | string[] | undefined>;
  } = {},
): IncomingMessage {
  const body = options.body ?? "";

  return {
    method,

    headers: options.headers ?? {},

    async *[Symbol.asyncIterator]() {
      if (body.length > 0) {
        yield Buffer.from(body);
      }
    },
  } as unknown as IncomingMessage;
}

function createResponse(): {
  readonly response: ServerResponse;

  readonly recorded: RecordedResponse;
} {
  const recorded: RecordedResponse = {
    statusCode: 200,

    statusMessage: "",

    headers: new Map(),

    body: "",
  };

  const response = {
    get statusCode() {
      return recorded.statusCode;
    },

    set statusCode(value: number) {
      recorded.statusCode = value;
    },

    get statusMessage() {
      return recorded.statusMessage;
    },

    set statusMessage(value: string) {
      recorded.statusMessage = value;
    },

    setHeader(name: string, value: string) {
      recorded.headers.set(name.toLowerCase(), value);

      return this;
    },

    end(value?: string) {
      recorded.body = value ?? "";

      return this;
    },
  } as unknown as ServerResponse;

  return {
    response,

    recorded,
  };
}

describe("handleWebAppHttpRequest", () => {
  test("projects a GET request through the Web App executor and writes TextOutput", async () => {
    const request = createRequest("GET");

    const { response, recorded } = createResponse();

    const execute = vi.fn(async (_request: WebAppTriggerRequest): Promise<WebAppResult> => ({
      kind: "text",

      content: "vegas-reference",

      mimeType: "TEXT",

      fileName: null,
    }));

    const renderHtml = vi.fn(async () => {
      throw new Error("HTML renderer must not be called for TextOutput");
    });

    const handled = await handleWebAppHttpRequest({
      url: new URL("http://localhost:3001/exec/path/to/resource?a=1&a=2"),

      request,

      response,

      execute,

      renderHtml,
    });

    expect(handled).toBe(true);

    expect(execute).toHaveBeenCalledTimes(1);

    expect(execute).toHaveBeenCalledWith({
      method: "GET",

      queryString: "a=1&a=2",

      pathInfo: "path/to/resource",
    });

    expect(renderHtml).not.toHaveBeenCalled();

    expect(recorded.statusCode).toBe(200);

    expect(recorded.headers.get("content-type")).toBe("text/plain; charset=utf-8");

    expect(recorded.body).toBe("vegas-reference");
  });

  test("projects a POST body and content type through the Web App executor", async () => {
    const request = createRequest("POST", {
      body: "a=body1&a=body2",

      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
    });

    const { response, recorded } = createResponse();

    const execute = vi.fn(async (_request: WebAppTriggerRequest): Promise<WebAppResult> => ({
      kind: "text",

      content: JSON.stringify({
        ok: true,
      }),

      mimeType: "JSON",

      fileName: "reference.json",
    }));

    const handled = await handleWebAppHttpRequest({
      url: new URL("http://localhost:3001/dev?a=query"),

      request,

      response,

      execute,

      renderHtml: async () => {
        throw new Error("HTML renderer must not be called for TextOutput");
      },
    });

    expect(handled).toBe(true);

    expect(execute).toHaveBeenCalledTimes(1);

    expect(execute).toHaveBeenCalledWith({
      method: "POST",

      queryString: "a=query",

      body: "a=body1&a=body2",

      contentType: "application/x-www-form-urlencoded",
    });

    expect(recorded.statusCode).toBe(200);

    expect(recorded.headers.get("content-type")).toBe("application/json; charset=utf-8");

    expect(recorded.headers.get("content-disposition")).toBe(
      "attachment; filename=\"reference.json\"; filename*=UTF-8''reference.json",
    );

    expect(recorded.body).toBe('{"ok":true}');
  });

  test("rejects a reserved request before executing user code", async () => {
    const request = createRequest("GET");

    const { response, recorded } = createResponse();

    const execute = vi.fn(async (_request: WebAppTriggerRequest): Promise<WebAppResult> => ({
      kind: "unsupported",
    }));

    const handled = await handleWebAppHttpRequest({
      url: new URL("http://localhost:3001/exec?c=reserved"),

      request,

      response,

      execute,

      renderHtml: async () => {
        throw new Error("HTML renderer must not be called for rejected requests");
      },
    });

    expect(handled).toBe(true);

    expect(execute).not.toHaveBeenCalled();

    expect(recorded.statusCode).toBe(400);

    expect(recorded.statusMessage).toBe("Bad Request");

    expect(recorded.headers.get("content-type")).toBe("text/html; charset=utf-8");

    expect(recorded.body).toContain("Bad Request");
  });

  test("renders HtmlOutput through the host HTML renderer", async () => {
    const request = createRequest("GET");

    const { response, recorded } = createResponse();

    const execute = vi.fn(async (_request: WebAppTriggerRequest): Promise<WebAppResult> => ({
      kind: "html",

      content: "<p>hello</p>",

      title: "",

      faviconUrl: null,

      metaTags: [],

      xFrameOptionsMode: "SAMEORIGIN",
    }));

    const renderHtml = vi.fn(async () => "<!doctype html><html><body>host</body></html>");

    const url = new URL("http://localhost:3001/exec");

    const handled = await handleWebAppHttpRequest({
      url,

      request,

      response,

      execute,

      renderHtml,
    });

    expect(handled).toBe(true);

    expect(renderHtml).toHaveBeenCalledTimes(1);

    expect(renderHtml).toHaveBeenCalledWith(
      url,
      expect.objectContaining({
        kind: "html",

        content: "<p>hello</p>",
      }),
    );

    expect(recorded.statusCode).toBe(200);

    expect(recorded.headers.get("content-type")).toBe("text/html; charset=utf-8");

    expect(recorded.headers.get("x-frame-options")).toBe("SAMEORIGIN");

    expect(recorded.body).toBe("<!doctype html><html><body>host</body></html>");
  });

  test("writes the stable local unsupported-result document", async () => {
    const request = createRequest("GET");

    const { response, recorded } = createResponse();

    const handled = await handleWebAppHttpRequest({
      url: new URL("http://localhost:3001/exec"),

      request,

      response,

      execute: async () => ({
        kind: "unsupported",
      }),

      renderHtml: async () => {
        throw new Error("HTML renderer must not be called for unsupported results");
      },
    });

    expect(handled).toBe(true);

    expect(recorded.statusCode).toBe(200);

    expect(recorded.headers.get("content-type")).toBe("text/html; charset=utf-8");

    expect(recorded.body).toContain("not a supported web app return type");
  });

  test("does not claim non-Web-App paths", async () => {
    const request = createRequest("GET");

    const { response } = createResponse();

    const execute = vi.fn(async (_request: WebAppTriggerRequest): Promise<WebAppResult> => ({
      kind: "unsupported",
    }));

    const handled = await handleWebAppHttpRequest({
      url: new URL("http://localhost:3001/not-a-web-app"),

      request,

      response,

      execute,

      renderHtml: async () => "",
    });

    expect(handled).toBe(false);

    expect(execute).not.toHaveBeenCalled();
  });

  test("does not claim unsupported HTTP methods", async () => {
    const request = createRequest("PUT");

    const { response } = createResponse();

    const execute = vi.fn(async (_request: WebAppTriggerRequest): Promise<WebAppResult> => ({
      kind: "unsupported",
    }));

    const handled = await handleWebAppHttpRequest({
      url: new URL("http://localhost:3001/exec"),

      request,

      response,

      execute,

      renderHtml: async () => "",
    });

    expect(handled).toBe(false);

    expect(execute).not.toHaveBeenCalled();
  });
});
