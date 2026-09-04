import { expect, test, vi } from "vitest";

import { RuntimeScope } from "../scope";
import type { RuntimeHostDependencies } from "./registry";
import { createRuntimeServiceRegistry } from "./registry";

function createDependencies(
  overrides: Partial<RuntimeHostDependencies> = {},
): RuntimeHostDependencies {
  return {
    spreadsheetStore: new Map(),
    fetcher: {
      async fetch() {
        return {
          headers: {},
          content: [],
          responseCode: 200,
        };
      },
    },
    htmlResourceResolver: { resolve: () => "" },
    cacheStore: {
      document: {},
      script: {},
      user: {},
    },
    propertiesStore: {
      document: {},
      script: {},
      user: {},
    },
    sessionEnvironment: {
      executeAs: "USER_ACCESSING",
    },
    clock: { now: () => 0 },
    ...overrides,
  };
}

test("dependency wiring", () => {
  const dependencies = createDependencies();
  const registry = createRuntimeServiceRegistry(dependencies);

  expect(registry.Range).toBeDefined();
  expect(registry.Session).toBeDefined();
  expect(registry.Cache).toBeDefined();
  expect(registry.Properties).toBeDefined();
});

test("dependency injection", async () => {
  const basetime = 10;
  const dependencies = createDependencies({
    clock: { now: () => basetime },
  });
  const registry = createRuntimeServiceRegistry(dependencies);
  const expired = 10;
  await registry.Cache.put(RuntimeScope.SCRIPT, "key", "value", expired);

  expect(dependencies.cacheStore.script["key"].expired).toBe(basetime + expired * 1000);
});

test("UrlFetch dependency injection", async () => {
  const fetch = vi.fn(async () => ({
    headers: {},
    content: [1, 2, 3],
    responseCode: 201,
  }));
  const registry = createRuntimeServiceRegistry(
    createDependencies({
      fetcher: { fetch },
    }),
  );
  const result = await registry.UrlFetch.fetch({
    url: "https://example.com",
    method: "post",
    body: "hello",
  });

  expect(fetch).toHaveBeenCalledWith({
    url: "https://example.com",
    method: "post",
    body: "hello",
  });
  expect(result.responseCode).toBe(201);
});

test("Html resource resolver dependency injection", async () => {
  const resolve = vi.fn(() => "<h1>Hello</h1>");
  const registry = createRuntimeServiceRegistry(
    createDependencies({
      htmlResourceResolver: {
        resolve,
      },
    }),
  );
  const result = await registry.Html.getFileContent("index");

  expect(resolve).toHaveBeenCalledWith("index");
  expect(result).toBe("<h1>Hello</h1>");
});

test("SpreadsheetApp create", async () => {
  const dependencies = createDependencies();
  const registry = createRuntimeServiceRegistry(dependencies);
  const id = await registry.SpreadsheetApp.create({
    name: "Test",
    rows: 2,
    columns: 3,
  });
  const spreadsheet = dependencies.spreadsheetStore.get(id);

  expect(spreadsheet?.name).toBe("Test");
  expect(spreadsheet?.sheets.get(0)).toEqual({
    name: "Sheet1",
    cells: [
      ["", "", ""],
      ["", "", ""],
    ],
  });
});

test("call SheetHandler methods", async () => {
  const dependencies = createDependencies();
  const registry = createRuntimeServiceRegistry(dependencies);
  const store = dependencies.spreadsheetStore;
  store.set("spreadsheet-id", {
    name: "Book",
    sheets: new Map([
      [
        123,
        {
          name: "Sheet1",
          cells: [
            ["", "value", ""],
            ["", "", ""],
          ],
        },
      ],
    ]),
  });

  expect(
    await registry.Sheet.getLastRow({
      spreadsheetId: "spreadsheet-id",
      sheetId: 123,
    }),
  ).toBe(1);
  expect(
    await registry.Sheet.getLastColumn({
      spreadsheetId: "spreadsheet-id",
      sheetId: 123,
    }),
  ).toBe(2);
  expect(await registry.Sheet.getMaxRows({ spreadsheetId: "spreadsheet-id", sheetId: 123 })).toBe(
    2,
  );
  expect(
    await registry.Sheet.getMaxColumns({ spreadsheetId: "spreadsheet-id", sheetId: 123 }),
  ).toBe(3);
  expect(await registry.Sheet.getSheetName({ spreadsheetId: "spreadsheet-id", sheetId: 123 })).toBe(
    "Sheet1",
  );
});
