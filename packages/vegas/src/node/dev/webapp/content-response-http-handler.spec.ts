import { describe, expect, test, vi } from "vitest";

import type { ContentMimeType, TextOutputSnapshot } from "../../runtime";
import {
  createContentResponseHttpHandler,
  createContentResponsePath,
  resolveContentResponseMimeType,
} from "./content-response-http-handler";
import { ContentResponseRegistry } from "./content-response-registry";

function createResponse() {
  const headers = new Map<string, string>();
  let body: unknown;

  return {
    response: {
      statusCode: 0,
      setHeader: vi.fn((name: string, value: string) => {
        headers.set(name, value);
      }),
      end: vi.fn((value?: unknown) => {
        body = value;
      }),
    },
    headers,
    getBody: () => body,
  };
}

describe("resolveContentResponseMimeType", () => {
  test.each([
    ["ATOM", "application/atom+xml"],
    ["CSV", "text/csv"],
    ["ICAL", "text/calendar"],
    ["JAVASCRIPT", "application/javascript"],
    ["JSON", "application/json"],
    ["RSS", "application/rss+xml"],
    ["TEXT", "text/plain"],
    ["VCARD", "text/vcard"],
    ["XML", "application/xml"],
  ] satisfies ReadonlyArray<readonly [ContentMimeType, string]>)(
    "resolve %s",
    (mimeType, expected) => {
      expect(resolveContentResponseMimeType(mimeType)).toBe(expected);
    },
  );
});

describe("createContentResponseHttpHandler", () => {
  test("serve and consume a one-time content response", () => {
    const registry = new ContentResponseRegistry({
      createId: () => "content-1",
      now: () => 1_000,
    });
    const output = {
      content: '{"ok":true}',
      fileName: null,
      mimeType: "JSON",
    } satisfies TextOutputSnapshot;
    const id = registry.issue(output);
    const handler = createContentResponseHttpHandler({ responses: registry });
    const first = createResponse();
    const next = vi.fn();

    handler(
      { method: "GET", url: createContentResponsePath(id), headers: {} } as any,
      first.response as any,
      next,
    );

    expect(first.response.statusCode).toBe(200);
    expect(first.headers.get("Content-Type")).toBe("application/json; charset=utf-8");
    expect(first.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(first.headers.get("Cache-Control")).toBe(
      "no-cache, no-store, max-age=0, must-revalidate",
    );
    expect(first.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(first.getBody()).toBe('{"ok":true}');
    expect(next).not.toHaveBeenCalled();

    const second = createResponse();

    handler(
      { method: "GET", url: createContentResponsePath(id), headers: {} } as any,
      second.response as any,
      vi.fn(),
    );

    expect(second.response.statusCode).toBe(404);
  });

  test("serve download metadata without placing raw filenames in headers", () => {
    const registry = new ContentResponseRegistry({
      createId: () => "content-1",
      now: () => 1_000,
    });
    const id = registry.issue({
      content: "name,value\nVegas,1",
      fileName: "Vegas export.csv",
      mimeType: "CSV",
    });
    const handler = createContentResponseHttpHandler({ responses: registry });
    const { response, headers } = createResponse();

    handler(
      { method: "GET", url: createContentResponsePath(id), headers: {} } as any,
      response as any,
      vi.fn(),
    );

    expect(response.statusCode).toBe(200);
    expect(headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(headers.get("Content-Disposition")).toBe(
      "attachment; filename*=UTF-8''Vegas%20export.csv",
    );
  });

  test("reject non-GET access to a content response URL", () => {
    const handler = createContentResponseHttpHandler({
      responses: { consume: vi.fn() },
    });
    const { response, headers } = createResponse();

    handler(
      { method: "POST", url: createContentResponsePath("content-1"), headers: {} } as any,
      response as any,
      vi.fn(),
    );

    expect(response.statusCode).toBe(405);
    expect(headers.get("Allow")).toBe("GET");
  });

  test("pass unrelated requests to the next middleware", () => {
    const next = vi.fn();
    const handler = createContentResponseHttpHandler({
      responses: { consume: vi.fn() },
    });
    const { response } = createResponse();

    handler({ method: "GET", url: "/userCodeAppPanel", headers: {} } as any, response as any, next);

    expect(next).toHaveBeenCalledOnce();
    expect(response.statusCode).toBe(0);
  });
});
