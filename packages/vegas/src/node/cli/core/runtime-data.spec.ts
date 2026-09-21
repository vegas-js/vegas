import { describe, expect, expectTypeOf, test } from "vitest";

import { RuntimeDataTarget } from "../../../shared/gas";
import {
  InMemoryPropertiesStore,
  InMemorySpreadsheetStore,
  resolvePropertiesNamespace,
  type InvocationScope,
} from "../../runtime";
import {
  applyPropertiesRuntimeData,
  loadRuntimeDataSnapshot,
  type RuntimeDataSnapshot,
} from "./runtime-data";

describe("runtime data", () => {
  test("keep snapshot sources and runtime data explicit", () => {
    expectTypeOf<RuntimeDataSnapshot>().toEqualTypeOf<{
      readonly properties?: {
        readonly source: string;
        readonly value: {
          documentProperties?: Record<string, string>;
          scriptProperties?: Record<string, string>;
          userProperties?: Record<string, string>;
        };
      };
      readonly session?: {
        readonly source: string;
        readonly value: {
          activeUserEmail?: string;
          activeUserLocale?: string;
          effectiveUserEmail?: string;
          temporaryActiveUserKey?: string;
        };
      };
      readonly spreadsheets: readonly {
        readonly source: string;
        readonly value: {
          readonly id: string;
          readonly url?: string;
          readonly name: string;
          readonly sheets: readonly {
            readonly id: number;
            readonly name: string;
            readonly maxRows: number;
            readonly maxColumns: number;
            readonly values?: readonly (readonly (string | number | boolean | Date)[])[];
          }[];
        };
      }[];
    }>();
  });

  test("load Properties, Session, and Spreadsheet runtime data into a snapshot", async () => {
    const sources = [
      "/project/runtime/properties.ts",
      "/project/runtime/session.ts",
      "/project/runtime/budget.ts",
      "/project/runtime/archive.ts",
    ];
    const modules: Record<string, unknown> = {
      [sources[0]]: {
        target: RuntimeDataTarget.Properties,
        scriptProperties: {
          environment: "test",
        },
      },
      [sources[1]]: {
        target: RuntimeDataTarget.Session,
        activeUserEmail: "active@example.com",
        activeUserLocale: "ja",
      },
      [sources[2]]: {
        target: RuntimeDataTarget.Spreadsheet,
        id: "budget",
        url: "http://localhost:5173/spreadsheets/budget",
        name: "Budget",
        sheets: [
          {
            id: 7,
            name: "Summary",
            maxRows: 10,
            maxColumns: 5,
            values: [
              ["Name", "Amount"],
              ["Vegas", 42],
            ],
          },
        ],
      },
      [sources[3]]: {
        target: RuntimeDataTarget.Spreadsheet,
        id: "archive",
        name: "Archive",
        sheets: [],
      },
    };

    const snapshot = await loadRuntimeDataSnapshot(
      "/project",
      sources,
      async ({ filePath }) => modules[filePath],
    );

    expect(snapshot.properties).toStrictEqual({
      source: sources[0],
      value: modules[sources[0]],
    });
    expect(snapshot.session).toStrictEqual({
      source: sources[1],
      value: modules[sources[1]],
    });
    expect(snapshot.spreadsheets.map(({ source }) => source)).toStrictEqual(sources.slice(2));

    const spreadsheetStore = new InMemorySpreadsheetStore(
      snapshot.spreadsheets.map(({ value }) => value),
    );
    const budget = await spreadsheetStore.getSpreadsheet("budget");
    await expect(
      spreadsheetStore.getSpreadsheetByUrl("http://localhost:5173/spreadsheets/budget"),
    ).resolves.toStrictEqual(budget);
    const summary = await spreadsheetStore.getSheetByName(budget, "Summary");

    if (summary === null) {
      throw new Error("expected Summary sheet");
    }

    await expect(
      spreadsheetStore.getRangeValues({
        service: "spreadsheet",
        kind: "range",
        spreadsheetId: "budget",
        sheetId: summary.sheetId,
        row: 1,
        column: 1,
        numRows: 2,
        numColumns: 2,
      }),
    ).resolves.toStrictEqual([
      ["Name", "Amount"],
      ["Vegas", 42],
    ]);
    await expect(spreadsheetStore.getSpreadsheet("archive")).resolves.toMatchObject({
      id: "archive",
    });
  });

  test("reject duplicate singleton runtime data", async () => {
    const cases = [
      {
        target: RuntimeDataTarget.Properties,
        first: "/project/runtime/properties-a.ts",
        second: "/project/runtime/properties-b.ts",
        message:
          "Duplicate Properties runtime data: /project/runtime/properties-a.ts, /project/runtime/properties-b.ts",
      },
      {
        target: RuntimeDataTarget.Session,
        first: "/project/runtime/session-a.ts",
        second: "/project/runtime/session-b.ts",
        message:
          "Duplicate Session runtime data: /project/runtime/session-a.ts, /project/runtime/session-b.ts",
      },
    ] as const;

    for (const { target, first, second, message } of cases) {
      await expect(
        loadRuntimeDataSnapshot("/project", [first, second], async () => ({ target })),
      ).rejects.toThrow(message);
    }
  });

  test("reject duplicate Spreadsheet id", async () => {
    const first = "/project/runtime/budget-a.ts";
    const second = "/project/runtime/budget-b.ts";

    await expect(
      loadRuntimeDataSnapshot("/project", [first, second], async () => ({
        target: RuntimeDataTarget.Spreadsheet,
        id: "budget",
        name: "Budget",
        sheets: [],
      })),
    ).rejects.toThrow(`Duplicate Spreadsheet runtime data id "budget": ${first}, ${second}`);
  });

  test("reject duplicate Spreadsheet URL", async () => {
    const first = "/project/runtime/budget.ts";
    const second = "/project/runtime/archive.ts";

    await expect(
      loadRuntimeDataSnapshot("/project", [first, second], async ({ filePath }) => ({
        target: RuntimeDataTarget.Spreadsheet,
        id: filePath === first ? "budget" : "archive",
        url: "https://docs.google.com/spreadsheets/d/shared",
        name: filePath === first ? "Budget" : "Archive",
        sheets: [],
      })),
    ).rejects.toThrow(
      `Duplicate Spreadsheet runtime data URL "https://docs.google.com/spreadsheets/d/shared": ${first}, ${second}`,
    );
  });

  test("reject Cache runtime data until it has a defined fixture contract", async () => {
    await expect(
      loadRuntimeDataSnapshot("/project", ["/project/runtime/cache.ts"], async () => ({
        target: RuntimeDataTarget.Cache,
      })),
    ).rejects.toThrow("Runtime data target Cache is not implemented: /project/runtime/cache.ts");
  });

  test("reject invalid runtime data payload", async () => {
    await expect(
      loadRuntimeDataSnapshot("/project", ["/project/runtime/session.ts"], async () => ({
        target: RuntimeDataTarget.Session,
        activeUserEmail: 42,
      })),
    ).rejects.toThrow("Invalid runtime data in /project/runtime/session.ts: activeUserEmail:");

    await expect(
      loadRuntimeDataSnapshot("/project", ["/project/runtime/budget.ts"], async () => ({
        target: RuntimeDataTarget.Spreadsheet,
        id: "budget",
        name: "Budget",
        sheets: [
          {
            id: 0,
            name: "Sheet1",
            maxRows: 0,
            maxColumns: 10,
          },
        ],
      })),
    ).rejects.toThrow("Invalid runtime data in /project/runtime/budget.ts: sheets[0].maxRows:");
  });

  test("reject runtime data without a supported target", async () => {
    await expect(
      loadRuntimeDataSnapshot("/project", ["/project/runtime/invalid.ts"], async () => ({
        target: "Unknown",
      })),
    ).rejects.toThrow("Unsupported runtime data target in /project/runtime/invalid.ts: Unknown");
  });
});

describe("applyPropertiesRuntimeData", () => {
  test("replace runtime property data in each available namespace", async () => {
    const store = new InMemoryPropertiesStore();
    const scope: InvocationScope = {
      scriptKey: "script-a",
      userKey: "user-a",
      documentKey: "document-a",
    };

    const script = resolvePropertiesNamespace(scope, "script");
    const user = resolvePropertiesNamespace(scope, "user");
    const document = resolvePropertiesNamespace(scope, "document");

    if (!script || !user || !document) {
      throw new Error("expected all property namespaces");
    }

    await store.set(script, "stale", "value");
    await store.set(user, "stale", "value");
    await store.set(document, "stale", "value");

    await applyPropertiesRuntimeData(store, scope, {
      scriptProperties: {
        script: "value",
      },
      userProperties: {
        user: "value",
      },
      documentProperties: {
        document: "value",
      },
    });

    expect(await store.getAll(script)).toStrictEqual({
      script: "value",
    });
    expect(await store.getAll(user)).toStrictEqual({
      user: "value",
    });
    expect(await store.getAll(document)).toStrictEqual({
      document: "value",
    });
  });

  test("ignore document property data without document context", async () => {
    const store = new InMemoryPropertiesStore();
    const scope: InvocationScope = {
      scriptKey: "script-a",
      userKey: "user-a",
    };

    await applyPropertiesRuntimeData(store, scope, {
      documentProperties: {
        document: "value",
      },
    });

    expect(resolvePropertiesNamespace(scope, "document")).toBeUndefined();
  });
});
