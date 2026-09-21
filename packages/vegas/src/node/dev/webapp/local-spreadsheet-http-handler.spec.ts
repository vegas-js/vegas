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
  test("render the current local Spreadsheet and selected Sheet", async () => {
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
            values: [
              ["Name", "Amount"],
              ["Vegas", 42],
            ],
          },
          {
            id: 9,
            name: "Archive",
            maxRows: 10,
            maxColumns: 5,
            values: [["Archived"]],
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
          url: "/__vegas/spreadsheets/budget?sheet=7",
        } as any,
        first.response as any,
        vi.fn(),
      ),
    );

    expect(first.response.statusCode).toBe(200);
    expect(first.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
    expect(String(first.getBody())).toContain("<title>Budget · Vegas Local Spreadsheet</title>");
    expect(String(first.getBody())).toContain(">Summary<");
    expect(String(first.getBody())).toContain(">Archive<");
    expect(String(first.getBody())).toContain(">Vegas<");
    expect(String(first.getBody())).toContain(">42<");
    expect(String(first.getBody())).not.toContain(">Archived<");

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

    expect(String(second.getBody())).toContain("<title>Forecast · Vegas Local Spreadsheet</title>");
    expect(String(second.getBody())).toContain("No sheets are available.");
  });

  test("keep Spreadsheet metadata available through the internal API route", async () => {
    const store = new InMemorySpreadsheetStore([
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
    const { response, headers, getBody } = createResponse();

    await Promise.resolve(
      handler(
        {
          method: "GET",
          url: "/__vegas/api/spreadsheets/budget",
        } as any,
        response as any,
        vi.fn(),
      ),
    );

    expect(headers.get("Content-Type")).toBe("application/json; charset=utf-8");
    expect(JSON.parse(String(getBody()))).toStrictEqual({
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
  });

  test("decode Spreadsheet ids from page and API routes", async () => {
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

    const page = createResponse();
    await Promise.resolve(
      handler(
        {
          method: "GET",
          url: "/__vegas/spreadsheets/budget%3A2026",
        } as any,
        page.response as any,
        vi.fn(),
      ),
    );

    expect(String(page.getBody())).toContain("<title>Budget · Vegas Local Spreadsheet</title>");

    const api = createResponse();
    await Promise.resolve(
      handler(
        {
          method: "GET",
          url: "/__vegas/api/spreadsheets/budget%3A2026",
        } as any,
        api.response as any,
        vi.fn(),
      ),
    );

    expect(JSON.parse(String(api.getBody()))).toMatchObject({
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
