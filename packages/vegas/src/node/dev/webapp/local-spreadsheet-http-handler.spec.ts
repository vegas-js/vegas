import { Readable } from "node:stream";

import { describe, expect, test, vi } from "vitest";

import { InMemorySpreadsheetStore } from "../../runtime";
import { createLocalSpreadsheetHttpHandler } from "./local-spreadsheet-http-handler";

type LocalSpreadsheetHttpHandler = ReturnType<typeof createLocalSpreadsheetHttpHandler>;
type LocalSpreadsheetRequest = Parameters<LocalSpreadsheetHttpHandler>[0];
type LocalSpreadsheetResponse = Parameters<LocalSpreadsheetHttpHandler>[1];

function createRequest(method: string, url: string, body?: string): LocalSpreadsheetRequest {
  return Object.assign(Readable.from(body === undefined ? [] : [body]), {
    method,
    url,
    headers: {},
  }) as unknown as LocalSpreadsheetRequest;
}

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
    } as unknown as LocalSpreadsheetResponse,
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
        createRequest("GET", "/__vegas/spreadsheets/budget?sheet=7"),
        first.response,
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
      handler(createRequest("GET", "/__vegas/spreadsheets/forecast"), second.response, vi.fn()),
    );

    expect(String(second.getBody())).toContain("<title>Forecast · Vegas Local Spreadsheet</title>");
    expect(String(second.getBody())).toContain("No sheets are available.");
  });

  test("render an editable viewport for a blank Sheet", async () => {
    const store = new InMemorySpreadsheetStore([
      {
        id: "blank",
        name: "Blank",
        sheets: [
          {
            id: 0,
            name: "Sheet1",
            maxRows: 1_000,
            maxColumns: 26,
          },
        ],
      },
    ]);
    const handler = createLocalSpreadsheetHttpHandler({
      getSpreadsheetStore: () => store,
    });
    const { response, getBody } = createResponse();

    await Promise.resolve(
      handler(createRequest("GET", "/__vegas/spreadsheets/blank"), response, vi.fn()),
    );

    const body = String(getBody());

    expect(response.statusCode).toBe(200);
    expect(body).not.toContain("This sheet has no cell values.");
    expect(body).toContain('<th scope="col">J</th>');
    expect(body).not.toContain('<th scope="col">K</th>');
    expect(body).toContain('<th scope="row">20</th>');
    expect(body).not.toContain('<th scope="row">21</th>');
    expect(body).toContain('data-row="20" data-column="10" tabindex="0"');
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
      handler(createRequest("GET", "/__vegas/api/spreadsheets/budget"), response, vi.fn()),
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

  test("update one local Spreadsheet cell through the internal API", async () => {
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
            values: [
              ["Name", "Amount"],
              ["Vegas", 42],
            ],
          },
        ],
      },
    ]);
    const handler = createLocalSpreadsheetHttpHandler({
      getSpreadsheetStore: () => store,
    });
    const { response } = createResponse();

    await Promise.resolve(
      handler(
        createRequest(
          "PATCH",
          "/__vegas/api/spreadsheets/budget/cells",
          JSON.stringify({
            sheetId: 7,
            row: 2,
            column: 2,
            value: 100,
          }),
        ),
        response,
        vi.fn(),
      ),
    );

    expect(response.statusCode).toBe(204);
    await expect(
      store.getRangeValues({
        service: "spreadsheet",
        kind: "range",
        spreadsheetId: "budget",
        sheetId: 7,
        row: 2,
        column: 2,
        numRows: 1,
        numColumns: 1,
      }),
    ).resolves.toStrictEqual([[100]]);
  });

  test.each([
    ["invalid JSON", "{"],
    [
      "non-integer Sheet id",
      JSON.stringify({
        sheetId: "7",
        row: 2,
        column: 2,
        value: 100,
      }),
    ],
    [
      "non-positive row",
      JSON.stringify({
        sheetId: 7,
        row: 0,
        column: 2,
        value: 100,
      }),
    ],
    [
      "unsupported cell value",
      JSON.stringify({
        sheetId: 7,
        row: 2,
        column: 2,
        value: null,
      }),
    ],
  ])("reject %s in a local Spreadsheet cell update", async (_label, body) => {
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
            values: [["unchanged"]],
          },
        ],
      },
    ]);
    const handler = createLocalSpreadsheetHttpHandler({
      getSpreadsheetStore: () => store,
    });
    const { response } = createResponse();
    const next = vi.fn();

    await Promise.resolve(
      handler(
        createRequest("PATCH", "/__vegas/api/spreadsheets/budget/cells", body),
        response,
        next,
      ),
    );

    expect(next).toHaveBeenCalledOnce();
    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    await expect(
      store.getRangeValues({
        service: "spreadsheet",
        kind: "range",
        spreadsheetId: "budget",
        sheetId: 7,
        row: 1,
        column: 1,
        numRows: 1,
        numColumns: 1,
      }),
    ).resolves.toStrictEqual([["unchanged"]]);
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
      handler(createRequest("GET", "/__vegas/spreadsheets/budget%3A2026"), page.response, vi.fn()),
    );

    expect(String(page.getBody())).toContain("<title>Budget · Vegas Local Spreadsheet</title>");

    const api = createResponse();
    await Promise.resolve(
      handler(
        createRequest("GET", "/__vegas/api/spreadsheets/budget%3A2026"),
        api.response,
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

    await Promise.resolve(handler(createRequest("GET", "/dev"), response, next));

    expect(next).toHaveBeenCalledOnce();
    expect(response.statusCode).toBe(0);
  });
});
