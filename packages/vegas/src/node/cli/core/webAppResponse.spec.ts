import { describe, expect, test } from "vitest";

import type { WebAppTextMimeType } from "../../runtime/triggers";
import {
  createUnsupportedWebAppResultHtml,
  projectRejectedWebAppRequestHttpResponse,
  projectWebAppTextHttpResponse,
} from "./webAppResponse";

describe("projectWebAppTextHttpResponse", () => {
  const cases: readonly [WebAppTextMimeType, string][] = [
    ["CSV", "text/csv; charset=utf-8"],
    ["ICAL", "text/calendar; charset=utf-8"],
    ["JAVASCRIPT", "text/javascript; charset=utf-8"],
    ["JSON", "application/json; charset=utf-8"],
    ["TEXT", "text/plain; charset=utf-8"],
    ["VCARD", "text/vcard; charset=utf-8"],
  ];

  test.each(cases)("maps %s to its characterized HTTP content type", (mimeType, contentType) => {
    expect(
      projectWebAppTextHttpResponse({
        kind: "text",
        content: "vegas-reference",
        mimeType,
        fileName: null,
      }),
    ).toEqual({
      statusCode: 200,
      contentType,
      contentDisposition: null,
      body: "vegas-reference",
    });
  });

  test("projects the characterized download content disposition", () => {
    expect(
      projectWebAppTextHttpResponse({
        kind: "text",
        content: "vegas-reference-text",
        mimeType: "TEXT",
        fileName: "reference.txt",
      }),
    ).toEqual({
      statusCode: 200,

      contentType: "text/plain; charset=utf-8",

      contentDisposition: "attachment; filename=\"reference.txt\"; filename*=UTF-8''reference.txt",

      body: "vegas-reference-text",
    });
  });
});

test("creates a stable local unsupported-result error document", () => {
  const html = createUnsupportedWebAppResultHtml();

  expect(html).toContain("<!doctype html>");

  expect(html).toContain("not a supported web app return type");
});

test("projects the characterized reserved-request HTTP outcome", () => {
  expect(projectRejectedWebAppRequestHttpResponse()).toEqual({
    statusCode: 400,

    statusMessage: "Bad Request",

    contentType: "text/html; charset=utf-8",

    body: expect.any(String),
  });
});
