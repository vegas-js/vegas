import { expect, test } from "vitest";

import { HttpResponse } from "./HTTPResponse";

test("getContent() exposes GAS signed bytes", () => {
  const response = new HttpResponse(
    {
      "Content-Type": "text/plain",
    },
    [99, 97, 102, 195, 169],
    200,
    "https://httpbingo.org/base64/Y2Fmw6k=",
  );

  expect(response.getContent()).toEqual([99, 97, 102, -61, -87]);
});

test("getContentText() decodes the original response bytes", () => {
  const response = new HttpResponse(
    {
      "Content-Type": "text/plain",
    },
    [99, 97, 102, 195, 169],
    200,
    "https://httpbingo.org/base64/Y2Fmw6k=",
  );

  expect(response.getContentText()).toBe("café");

  expect(response.getContentText("ISO-8859-1")).toBe("cafÃ©");
});

test("getBlob() preserves characterized response metadata", () => {
  const response = new HttpResponse(
    {
      "Content-Type": "text/plain; charset=UTF-8",
    },
    [99, 97, 102, 195, 169],
    200,
    "https://httpbingo.org/response-headers?X-Vegas-Header=alpha",
  );

  const blob = response.getBlob();

  expect(blob.getBytes()).toEqual([99, 97, 102, -61, -87]);

  expect(blob.getContentType()).toBe("text/plain");

  expect(blob.getName()).toBe("response-headers.txt");
});

test("getBlob() derives the characterized base64 resource name", () => {
  const response = new HttpResponse(
    {
      "Content-Type": "text/plain",
    },
    [99, 97, 102, 195, 169],
    200,
    "https://httpbingo.org/base64/Y2Fmw6k=",
  );

  expect(response.getBlob().getName()).toBe("Y2Fmw6k=.txt");
});
