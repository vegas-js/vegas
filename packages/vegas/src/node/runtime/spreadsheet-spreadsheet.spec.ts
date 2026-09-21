import { describe, expect, test } from "vitest";

import type { HostBridge } from "./host-bridge";
import type { HostCall, HostCallResult } from "./host-call";
import type { SpreadsheetObjectHydrator } from "./spreadsheet-hydrator";
import type { Range } from "./spreadsheet-range";
import type {
  RangeReference,
  SheetReference,
  SpreadsheetObjectReference,
  SpreadsheetReference,
} from "./spreadsheet-reference";
import type { Sheet } from "./spreadsheet-sheet";
import { Spreadsheet } from "./spreadsheet-spreadsheet";

class RecordingHostBridge implements HostBridge {
  readonly calls: HostCall[] = [];
  readonly #respond: (call: HostCall) => unknown;

  constructor(respond: (call: HostCall) => unknown) {
    this.#respond = respond;
  }

  call<C extends HostCall>(call: C): HostCallResult<C> {
    this.calls.push(call);
    return this.#respond(call) as HostCallResult<C>;
  }
}

class RecordingSpreadsheetObjectHydrator implements SpreadsheetObjectHydrator {
  readonly references: SpreadsheetObjectReference[] = [];
  readonly #respond: (reference: SpreadsheetObjectReference) => Spreadsheet | Sheet | Range;

  constructor(respond: (reference: SpreadsheetObjectReference) => Spreadsheet | Sheet | Range) {
    this.#respond = respond;
  }

  hydrate(reference: SpreadsheetReference): Spreadsheet;
  hydrate(reference: SheetReference): Sheet;
  hydrate(reference: RangeReference): Range;
  hydrate(reference: SpreadsheetObjectReference): Spreadsheet | Sheet | Range {
    this.references.push(reference);
    return this.#respond(reference);
  }
}

const spreadsheetReference = {
  service: "spreadsheet",
  kind: "spreadsheet",
  id: "spreadsheet-a",
} satisfies SpreadsheetReference;

function createFixture() {
  const sheet7 = {} as Sheet;
  const sheet9 = {} as Sheet;
  const bridge = new RecordingHostBridge((call) => {
    if (call.service !== "spreadsheet") {
      throw new Error(`unexpected service: ${call.service}`);
    }

    switch (call.operation) {
      case "get-spreadsheet-url":
        return "http://localhost:62000/__vegas/spreadsheets/spreadsheet-a";
      case "get-spreadsheet-metadata":
        return {
          name: "Budget",
        };
      case "list-sheets":
        return [
          {
            service: "spreadsheet",
            kind: "sheet",
            spreadsheetId: call.spreadsheet.id,
            sheetId: 7,
          },
          {
            service: "spreadsheet",
            kind: "sheet",
            spreadsheetId: call.spreadsheet.id,
            sheetId: 9,
          },
        ] satisfies SheetReference[];
      case "get-sheet":
        if (call.sheetId !== 7 && call.sheetId !== 9) {
          return null;
        }

        return {
          service: "spreadsheet",
          kind: "sheet",
          spreadsheetId: call.spreadsheet.id,
          sheetId: call.sheetId,
        } satisfies SheetReference;
      case "get-sheet-by-name":
        if (call.name === "Missing") {
          return null;
        }

        return {
          service: "spreadsheet",
          kind: "sheet",
          spreadsheetId: call.spreadsheet.id,
          sheetId: 7,
        } satisfies SheetReference;
      default:
        throw new Error(`unexpected host call: ${call.service}#${call.operation}`);
    }
  });
  const hydrator = new RecordingSpreadsheetObjectHydrator((reference) => {
    if (reference.kind !== "sheet") {
      throw new Error(`unexpected Spreadsheet object reference: ${reference.kind}`);
    }

    if (reference.sheetId === 7) {
      return sheet7;
    }

    if (reference.sheetId === 9) {
      return sheet9;
    }

    throw new Error(`unexpected Sheet reference: ${reference.sheetId}`);
  });

  return {
    bridge,
    hydrator,
    sheet7,
    sheet9,
    spreadsheet: new Spreadsheet(bridge, spreadsheetReference, hydrator),
  };
}

describe("Spreadsheet", () => {
  test("read metadata and hydrate Sheet references through collaborators", () => {
    const { bridge, hydrator, sheet7, sheet9, spreadsheet } = createFixture();

    expect(spreadsheet.getId()).toBe("spreadsheet-a");
    expect(spreadsheet.getUrl()).toBe("http://localhost:62000/__vegas/spreadsheets/spreadsheet-a");
    expect(spreadsheet.getName()).toBe("Budget");
    expect(spreadsheet.getNumSheets()).toBe(2);
    expect(spreadsheet.getSheets()).toStrictEqual([sheet7, sheet9]);
    expect(spreadsheet.getSheetById(7)).toBe(sheet7);
    expect(spreadsheet.getSheetById(999)).toBeNull();
    expect(spreadsheet.getSheetByName("Summary")).toBe(sheet7);
    expect(spreadsheet.getSheetByName("Missing")).toBeNull();

    expect(bridge.calls.map(({ operation }) => operation)).toStrictEqual([
      "get-spreadsheet-url",
      "get-spreadsheet-metadata",
      "list-sheets",
      "list-sheets",
      "get-sheet",
      "get-sheet",
      "get-sheet-by-name",
      "get-sheet-by-name",
    ]);
    expect(hydrator.references).toStrictEqual([
      {
        service: "spreadsheet",
        kind: "sheet",
        spreadsheetId: "spreadsheet-a",
        sheetId: 7,
      },
      {
        service: "spreadsheet",
        kind: "sheet",
        spreadsheetId: "spreadsheet-a",
        sheetId: 9,
      },
      {
        service: "spreadsheet",
        kind: "sheet",
        spreadsheetId: "spreadsheet-a",
        sheetId: 7,
      },
      {
        service: "spreadsheet",
        kind: "sheet",
        spreadsheetId: "spreadsheet-a",
        sheetId: 7,
      },
    ]);
  });

  test("rename a Spreadsheet through the HostBridge", () => {
    let name = "Budget";
    const bridge = new RecordingHostBridge((call) => {
      if (call.service !== "spreadsheet") {
        throw new Error(`unexpected service: ${call.service}`);
      }

      switch (call.operation) {
        case "get-spreadsheet-metadata":
          return { name };
        case "rename-spreadsheet":
          name = call.name;
          return undefined;
        default:
          throw new Error(`unexpected host call: ${call.service}#${call.operation}`);
      }
    });
    const hydrator = new RecordingSpreadsheetObjectHydrator(() => {
      throw new Error("unexpected hydration");
    });
    const spreadsheet = new Spreadsheet(bridge, spreadsheetReference, hydrator);

    expect(spreadsheet.getName()).toBe("Budget");
    expect(spreadsheet.rename("Forecast")).toBeUndefined();
    expect(spreadsheet.getName()).toBe("Forecast");
    expect(bridge.calls.map(({ operation }) => operation)).toStrictEqual([
      "get-spreadsheet-metadata",
      "rename-spreadsheet",
      "get-spreadsheet-metadata",
    ]);
    expect(hydrator.references).toHaveLength(0);
  });

  test("reject non-integer Sheet ids before HostBridge calls", () => {
    const { bridge, hydrator, spreadsheet } = createFixture();

    expect(() => spreadsheet.getSheetById(7.5)).toThrow("Spreadsheet sheet id must be an integer.");
    expect(bridge.calls).toHaveLength(0);
    expect(hydrator.references).toHaveLength(0);
  });
});
