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
  loadRuntimeData,
  type LoadedRuntimeData,
} from "./runtime-data";

describe("runtime data", () => {
  test("keep loaded Session and Spreadsheet data explicit", () => {
    expectTypeOf<LoadedRuntimeData>().toEqualTypeOf<{
      readonly session?: {
        activeUserEmail?: string;
        activeUserLocale?: string;
        effectiveUserEmail?: string;
        temporaryActiveUserKey?: string;
      };
      readonly spreadsheets: readonly {
        readonly id: string;
        readonly name: string;
        readonly sheets: readonly {
          readonly id: number;
          readonly name: string;
          readonly maxRows: number;
          readonly maxColumns: number;
          readonly values?: readonly (readonly (string | number | boolean | Date)[])[];
        }[];
      }[];
    }>();
  });

  test("load Properties, Session, and Spreadsheet runtime data", async () => {
    const propertiesStore = new InMemoryPropertiesStore();
    const scope: InvocationScope = {
      scriptKey: "script-a",
      userKey: "user-a",
    };
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

    const runtimeData = await loadRuntimeData(
      "/project",
      sources,
      propertiesStore,
      scope,
      async ({ filePath }) => modules[filePath],
    );

    expect(runtimeData.session).toStrictEqual({
      target: RuntimeDataTarget.Session,
      activeUserEmail: "active@example.com",
      activeUserLocale: "ja",
    });
    expect(runtimeData.spreadsheets).toHaveLength(2);

    const script = resolvePropertiesNamespace(scope, "script");
    if (!script) {
      throw new Error("expected script properties namespace");
    }
    await expect(propertiesStore.getAll(script)).resolves.toStrictEqual({
      environment: "test",
    });

    const spreadsheetStore = new InMemorySpreadsheetStore(runtimeData.spreadsheets);
    const budget = await spreadsheetStore.getSpreadsheet("budget");
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
