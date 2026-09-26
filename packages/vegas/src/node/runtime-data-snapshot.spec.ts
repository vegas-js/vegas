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

  test("detach snapshot values from normalized runtime data inputs", () => {
    const properties = {
      scriptProperties: {
        environment: "test",
      },
    };
    const session = {
      activeUserEmail: "user@example.com",
    };
    const cellDate = new Date("2026-09-26T00:00:00.000Z");
    const row = [cellDate];
    const sheet = {
      id: 1,
      name: "Summary",
      maxRows: 5,
      maxColumns: 5,
      values: [row],
    };
    const spreadsheet = {
      id: "budget",
      name: "Budget",
      sheets: [sheet],
    };
    const snapshot = createRuntimeDataSnapshot([
      {
        source: "inline:properties",
        target: RuntimeDataTarget.Properties,
        value: properties,
      },
      {
        source: "inline:session",
        target: RuntimeDataTarget.Session,
        value: session,
      },
      {
        source: "inline:spreadsheet:budget",
        target: RuntimeDataTarget.Spreadsheet,
        value: spreadsheet,
      },
    ]);

    properties.scriptProperties.environment = "changed";
    session.activeUserEmail = "changed@example.com";
    spreadsheet.name = "Changed";
    sheet.name = "Changed";
    row[0] = new Date("2030-01-01T00:00:00.000Z");
    cellDate.setTime(0);

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
            sheets: [
              {
                id: 1,
                name: "Summary",
                maxRows: 5,
                maxColumns: 5,
                values: [[new Date("2026-09-26T00:00:00.000Z")]],
              },
            ],
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
