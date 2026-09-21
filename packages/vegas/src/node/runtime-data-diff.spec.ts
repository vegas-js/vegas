import { describe, expect, test } from "vitest";

import type { RuntimeDataSnapshot, RuntimeDataSpreadsheet } from "../shared/gas";
import { diffRuntimeDataSnapshots } from "./runtime-data-diff";

function spreadsheet(
  id: string,
  overrides: Partial<RuntimeDataSpreadsheet> = {},
): RuntimeDataSpreadsheet {
  return {
    id,
    name: id,
    sheets: [],
    ...overrides,
  };
}

describe("diffRuntimeDataSnapshots", () => {
  test("ignore source-only changes", () => {
    const previous = {
      properties: {
        source: "runtime/properties.ts",
        value: {
          scriptProperties: {
            environment: "test",
          },
        },
      },
      session: {
        source: "runtime/session.ts",
        value: {
          activeUserEmail: "user@example.com",
        },
      },
      spreadsheets: [
        {
          source: "runtime/budget.ts",
          value: spreadsheet("budget"),
        },
      ],
    } satisfies RuntimeDataSnapshot;
    const next = {
      properties: {
        source: "runtime/config/properties.ts",
        value: previous.properties.value,
      },
      session: {
        source: "runtime/config/session.ts",
        value: previous.session.value,
      },
      spreadsheets: [
        {
          source: "runtime/finance/budget.ts",
          value: previous.spreadsheets[0].value,
        },
      ],
    } satisfies RuntimeDataSnapshot;

    expect(diffRuntimeDataSnapshots(previous, next)).toStrictEqual([]);
  });

  test("detect singleton additions, removals, and value changes", () => {
    const previous = {
      properties: {
        source: "runtime/properties.ts",
        value: {
          scriptProperties: {
            environment: "development",
          },
        },
      },
      session: {
        source: "runtime/session.ts",
        value: {
          activeUserEmail: "old@example.com",
        },
      },
      spreadsheets: [],
    } satisfies RuntimeDataSnapshot;
    const next = {
      session: {
        source: "runtime/session.ts",
        value: {
          activeUserEmail: "new@example.com",
        },
      },
      spreadsheets: [],
    } satisfies RuntimeDataSnapshot;

    expect(diffRuntimeDataSnapshots(previous, next)).toStrictEqual(["properties", "session"]);
  });

  test("detect Spreadsheet additions, removals, and semantic changes by id", () => {
    const previous = {
      spreadsheets: [
        {
          source: "runtime/archive.ts",
          value: spreadsheet("archive"),
        },
        {
          source: "runtime/budget.ts",
          value: spreadsheet("budget", {
            name: "Budget",
          }),
        },
      ],
    } satisfies RuntimeDataSnapshot;
    const next = {
      spreadsheets: [
        {
          source: "runtime/budget.ts",
          value: spreadsheet("budget", {
            name: "Budget 2027",
          }),
        },
        {
          source: "runtime/report.ts",
          value: spreadsheet("report"),
        },
      ],
    } satisfies RuntimeDataSnapshot;

    expect(diffRuntimeDataSnapshots(previous, next)).toStrictEqual([
      "spreadsheet:archive",
      "spreadsheet:budget",
      "spreadsheet:report",
    ]);
  });

  test("treat a Spreadsheet id change as removal plus addition", () => {
    const previous = {
      spreadsheets: [
        {
          source: "runtime/budget.ts",
          value: spreadsheet("budget"),
        },
      ],
    } satisfies RuntimeDataSnapshot;
    const next = {
      spreadsheets: [
        {
          source: "runtime/budget.ts",
          value: spreadsheet("forecast"),
        },
      ],
    } satisfies RuntimeDataSnapshot;

    expect(diffRuntimeDataSnapshots(previous, next)).toStrictEqual([
      "spreadsheet:budget",
      "spreadsheet:forecast",
    ]);
  });

  test("compare Spreadsheet cell dates by value", () => {
    const createSnapshot = (date: Date) =>
      ({
        spreadsheets: [
          {
            source: "runtime/budget.ts",
            value: spreadsheet("budget", {
              sheets: [
                {
                  id: 1,
                  name: "Sheet1",
                  maxRows: 1,
                  maxColumns: 1,
                  values: [[date]],
                },
              ],
            }),
          },
        ],
      }) satisfies RuntimeDataSnapshot;

    expect(
      diffRuntimeDataSnapshots(
        createSnapshot(new Date("2026-09-21T00:00:00.000Z")),
        createSnapshot(new Date("2026-09-21T00:00:00.000Z")),
      ),
    ).toStrictEqual([]);

    expect(
      diffRuntimeDataSnapshots(
        createSnapshot(new Date("2026-09-21T00:00:00.000Z")),
        createSnapshot(new Date("2026-09-22T00:00:00.000Z")),
      ),
    ).toStrictEqual(["spreadsheet:budget"]);
  });
});
