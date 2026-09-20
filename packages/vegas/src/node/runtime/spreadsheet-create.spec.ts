import { describe, expect, expectTypeOf, test } from "vitest";

import {
  createSpreadsheetApp,
  InMemorySpreadsheetStore,
  Spreadsheet,
  SpreadsheetHostHandler,
  type HostBridge,
  type HostCall,
  type HostCallResult,
  type SpreadsheetReference,
} from "./index";

describe("Spreadsheet creation", () => {
  test("create a Spreadsheet with one empty sheet of the requested dimensions", async () => {
    const store = new InMemorySpreadsheetStore();

    const spreadsheet = await store.createSpreadsheet("Budget", 50, 5);
    const sheets = await store.listSheets(spreadsheet);

    expect(spreadsheet.id).toMatch(/^spreadsheet:\d+$/);
    expect(spreadsheet.id).not.toContain("Budget");
    await expect(store.getSpreadsheetMetadata(spreadsheet)).resolves.toStrictEqual({
      name: "Budget",
    });
    expect(sheets).toHaveLength(1);

    const sheet = sheets[0];
    if (sheet === undefined) {
      throw new Error("expected initial Spreadsheet sheet");
    }

    await expect(store.getSheetMetadata(sheet)).resolves.toStrictEqual({
      name: "Sheet1",
      maxRows: 50,
      maxColumns: 5,
      hiddenGridlines: false,
      rightToLeft: false,
      hidden: false,
    });
  });

  test("reject invalid dimensions before creating Spreadsheet state", async () => {
    const store = new InMemorySpreadsheetStore();

    await expect(store.createSpreadsheet("Invalid", 0, 5)).rejects.toThrow(
      "Spreadsheet rows must be a positive integer.",
    );
    await expect(store.createSpreadsheet("Invalid", 5, 0)).rejects.toThrow(
      "Spreadsheet columns must be a positive integer.",
    );
  });

  test("map create-spreadsheet calls through the Host handler", async () => {
    const handler = new SpreadsheetHostHandler(new InMemorySpreadsheetStore());
    const call = {
      service: "spreadsheet",
      operation: "create-spreadsheet",
      name: "Budget",
      rows: 50,
      columns: 5,
    } as const;

    expectTypeOf<HostCallResult<typeof call>>().toEqualTypeOf<SpreadsheetReference>();

    await expect(handler.handle(call)).resolves.toMatchObject({
      service: "spreadsheet",
      kind: "spreadsheet",
    });
  });

  test("hydrate SpreadsheetApp.create results from the HostBridge", () => {
    const calls: HostCall[] = [];
    const bridge: HostBridge = {
      call<C extends HostCall>(call: C): HostCallResult<C> {
        calls.push(call);

        if (call.service !== "spreadsheet" || call.operation !== "create-spreadsheet") {
          throw new Error(`unexpected host call: ${call.service}#${call.operation}`);
        }

        return {
          service: "spreadsheet",
          kind: "spreadsheet",
          id: "spreadsheet:1",
        } as HostCallResult<C>;
      },
    };
    const spreadsheetApp = createSpreadsheetApp(bridge);

    const spreadsheet = spreadsheetApp.create("Budget", 50, 5);

    expect(spreadsheet).toBeInstanceOf(Spreadsheet);
    expect(spreadsheet.getId()).toBe("spreadsheet:1");
    expect(calls).toStrictEqual([
      {
        service: "spreadsheet",
        operation: "create-spreadsheet",
        name: "Budget",
        rows: 50,
        columns: 5,
      },
    ]);
  });

  test("reject invalid create dimensions before crossing the HostBridge", () => {
    const calls: HostCall[] = [];
    const bridge: HostBridge = {
      call<C extends HostCall>(call: C): HostCallResult<C> {
        calls.push(call);
        throw new Error("unexpected host call");
      },
    };
    const spreadsheetApp = createSpreadsheetApp(bridge);

    expect(() => spreadsheetApp.create("Budget", 0, 5)).toThrow(
      "Spreadsheet rows must be a positive integer.",
    );
    expect(() => spreadsheetApp.create("Budget", 5, 0)).toThrow(
      "Spreadsheet columns must be a positive integer.",
    );
    expect(calls).toStrictEqual([]);
  });
});
