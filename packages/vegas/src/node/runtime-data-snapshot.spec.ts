import { describe, expect, test } from "vitest";

import { RuntimeDataTarget } from "../shared/gas";
import { createRuntimeDataSnapshot } from "./runtime-data-snapshot";

describe("createRuntimeDataSnapshot", () => {
  test("create a target-free snapshot from normalized runtime data inputs", () => {
    const snapshot = createRuntimeDataSnapshot([
      {
        source: "inline:properties",
        target: RuntimeDataTarget.Properties,
        value: {
          scriptProperties: {
            environment: "test",
          },
        },
      },
      {
        source: "inline:session",
        target: RuntimeDataTarget.Session,
        value: {
          activeUserEmail: "user@example.com",
        },
      },
      {
        source: "inline:spreadsheet:budget",
        target: RuntimeDataTarget.Spreadsheet,
        value: {
          id: "budget",
          name: "Budget",
          sheets: [],
        },
      },
    ]);

    expect(snapshot).toStrictEqual({
      properties: {
        source: "inline:properties",
        value: {
          scriptProperties: {
            environment: "test",
          },
        },
      },
      session: {
        source: "inline:session",
        value: {
          activeUserEmail: "user@example.com",
        },
      },
      spreadsheets: [
        {
          source: "inline:spreadsheet:budget",
          value: {
            id: "budget",
            name: "Budget",
            sheets: [],
          },
        },
      ],
    });
  });

  test("reject duplicate Spreadsheet sheet ids and names", () => {
    const cases = [
      {
        sheets: [
          {
            id: 1,
            name: "Summary",
            maxRows: 5,
            maxColumns: 5,
          },
          {
            id: 1,
            name: "Archive",
            maxRows: 5,
            maxColumns: 5,
          },
        ],
        message:
          'Duplicate Spreadsheet runtime data sheet id 1 in "budget": inline:spreadsheet:budget',
      },
      {
        sheets: [
          {
            id: 1,
            name: "Summary",
            maxRows: 5,
            maxColumns: 5,
          },
          {
            id: 2,
            name: "Summary",
            maxRows: 5,
            maxColumns: 5,
          },
        ],
        message:
          'Duplicate Spreadsheet runtime data sheet name "Summary" in "budget": inline:spreadsheet:budget',
      },
    ] as const;

    for (const { sheets, message } of cases) {
      expect(() =>
        createRuntimeDataSnapshot([
          {
            source: "inline:spreadsheet:budget",
            target: RuntimeDataTarget.Spreadsheet,
            value: {
              id: "budget",
              name: "Budget",
              sheets,
            },
          },
        ]),
      ).toThrow(message);
    }
  });
});
