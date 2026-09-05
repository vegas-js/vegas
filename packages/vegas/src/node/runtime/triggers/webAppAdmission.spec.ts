import { describe, expect, test } from "vitest";

import { getWebAppTriggerRequestRejection } from "./webAppAdmission";

describe("getWebAppTriggerRequestRejection", () => {
  test.each([
    [
      "GET query c",
      {
        method: "GET",
        queryString: "c=reserved",
      },
      {
        kind: "reserved-parameter",
        parameterName: "c",
        source: "query",
      },
    ],
    [
      "GET query sid",
      {
        method: "GET",
        queryString: "sid=reserved",
      },
      {
        kind: "reserved-parameter",
        parameterName: "sid",
        source: "query",
      },
    ],
    [
      "POST query c",
      {
        method: "POST",
        queryString: "c=reserved",
        contentType: "application/x-www-form-urlencoded",
        body: "a=1",
      },
      {
        kind: "reserved-parameter",
        parameterName: "c",
        source: "query",
      },
    ],
    [
      "POST query sid",
      {
        method: "POST",
        queryString: "sid=reserved",
        contentType: "application/x-www-form-urlencoded",
        body: "a=1",
      },
      {
        kind: "reserved-parameter",
        parameterName: "sid",
        source: "query",
      },
    ],
    [
      "POST body c",
      {
        method: "POST",
        contentType: "application/x-www-form-urlencoded",
        body: "c=reserved",
      },
      {
        kind: "reserved-parameter",
        parameterName: "c",
        source: "body",
      },
    ],
    [
      "POST body sid",
      {
        method: "POST",
        contentType: "application/x-www-form-urlencoded",
        body: "sid=reserved",
      },
      {
        kind: "reserved-parameter",
        parameterName: "sid",
        source: "body",
      },
    ],
  ] as const)("rejects characterized reserved parameter case: %s", (_name, request, expected) => {
    expect(getWebAppTriggerRequestRejection(request)).toEqual(expected);
  });

  test("accepts non-reserved query parameters", () => {
    expect(
      getWebAppTriggerRequestRejection({
        method: "GET",
        queryString: "a=1&b=2",
      }),
    ).toBeUndefined();
  });

  test("does not inspect non-form POST bodies for reserved parameters", () => {
    expect(
      getWebAppTriggerRequestRejection({
        method: "POST",
        contentType: "text/plain",
        body: "c=reserved",
      }),
    ).toBeUndefined();
  });

  test("recognizes form media type with parameters", () => {
    expect(
      getWebAppTriggerRequestRejection({
        method: "POST",
        contentType: "application/x-www-form-urlencoded; charset=utf-8",
        body: "sid=reserved",
      }),
    ).toEqual({
      kind: "reserved-parameter",
      parameterName: "sid",
      source: "body",
    });
  });
});
