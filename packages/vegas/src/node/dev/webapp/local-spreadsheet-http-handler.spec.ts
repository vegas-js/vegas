import { describe, expect, test, vi } from "vitest";

import { InMemorySpreadsheetStore } from "../../runtime";
import { createLocalSpreadsheetHttpHandler } from "./local-spreadsheet-http-handler";

function createResponse() {
  const headers = new Map<string, string>();
  let body: unknown;

  return {
    response: {
      statusCode: 0,
      setHeader(name: string, value: string) {
        headers.set(name, value);
      },
      end(value?: unknown) {
        body = value;
      },
    },
    headers,
    getBody: () => body,
  };
}

describe("createLocalSpreadsheetHttpHandler", () => {
  test("read Spreadsheet metadata from the current local Runtime store", async () => {
    let store = new InMemorySpreadsheetStore([
      {
        id: "budget",
        name: "Budget",
        sheets: [
          {
            id: 7,
            name: "Summary",
            maxRows: 20,
            maxColumns: 8,
          },
        ],
      },
    ]);
    const handler = createLocalSpreadsheetHttpHandler({
      getSpreadsheetStore: () => store,
    });

    const first = createResponse();
    await Promise.resolve(
      handler(
        {
          method: "GET",
          url: "/__vegas/spreadsheets/budget",
        } as any,
        first.response as any,
        vi.fn(),
      ),
    );

    expect(first.response.statusCode).toBe(200);
    expect(first.headers.get("Content-Type")).toBe("application/json; charset=utf-8");
    expect(JSON.parse(String(first.getBody()))).toStrictEqual({
      id: "budget",
      name: "Budget",
      sheets: [
        {
          id: 7,
          name: "Summary",
          maxRows: 20,
          maxColumns: 8,
        },
      ],
    });

    store = new InMemorySpreadsheetStore([
      {
        id: "forecast",
        name: "Forecast",
        sheets: [],
      },
    ]);

    const second = createResponse();
    await Promise.resolve(
      handler(
        {
          method: "GET",
          url: "/__vegas/spreadsheets/forecast",
        } as any,
        second.response as any,
        vi.fn(),
      ),
    );

    expect(JSON.parse(String(second.getBody()))).toStrictEqual({
      id: "forecast",
      name: "Forecast",
      sheets: [],
    });
  });

  test("decode Spreadsheet ids from the route", async () => {
    const store = new InMemorySpreadsheetStore([
      {
        id: "budget:2026",
        name: "Budget",
        sheets: [],
      },
    ]);
    const handler = createLocalSpreadsheetHttpHandler({
      getSpreadsheetStore: () => store,
    });
    const { response, getBody } = createResponse();

    await Promise.resolve(
      handler(
        {
          method: "GET",
          url: "/__vegas/spreadsheets/budget%3A2026",
        } as any,
        response as any,
        vi.fn(),
      ),
    );

    expect(JSON.parse(String(getBody()))).toMatchObject({
      id: "budget:2026",
    });
  });

  test("pass unrelated requests to the next middleware", async () => {
    const handler = createLocalSpreadsheetHttpHandler({
      getSpreadsheetStore: () => new InMemorySpreadsheetStore(),
    });
    const next = vi.fn();
    const { response } = createResponse();

    await Promise.resolve(
      handler(
        {
          method: "GET",
          url: "/dev",
        } as any,
        response as any,
        next,
      ),
    );

    expect(next).toHaveBeenCalledOnce();
    expect(response.statusCode).toBe(0);
  });
});
