import { describe, expect, test } from "vitest";

import { createRuntimeDataSnapshotFromFixture } from "./runtime-data-fixture";

describe("createRuntimeDataSnapshotFromFixture", () => {
  test("normalize inline Runtime data into a snapshot", () => {
    expect(
      createRuntimeDataSnapshotFromFixture({
        properties: {
          scriptProperties: {
            environment: "test",
          },
        },
        session: {
          activeUserEmail: "user@example.com",
        },
        spreadsheets: [
          {
            id: "budget",
            name: "Budget",
            sheets: [],
          },
        ],
      }),
    ).toStrictEqual({
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
          source: "inline:spreadsheets[0]",
          value: {
            id: "budget",
            name: "Budget",
            sheets: [],
          },
        },
      ],
    });
  });

  test("create an empty snapshot when Runtime data is omitted", () => {
    expect(createRuntimeDataSnapshotFromFixture()).toStrictEqual({
      spreadsheets: [],
    });
  });

  test("report inline source positions when fixture validation fails", () => {
    expect(() =>
      createRuntimeDataSnapshotFromFixture({
        spreadsheets: [
          {
            id: "budget",
            name: "Budget",
            sheets: [],
          },
          {
            id: "budget",
            name: "Budget copy",
            sheets: [],
          },
        ],
      }),
    ).toThrow(
      'Duplicate Spreadsheet runtime data id "budget": inline:spreadsheets[0], inline:spreadsheets[1]',
    );
  });

  test("reject invalid inline Runtime data payloads", () => {
    expect(() =>
      createRuntimeDataSnapshotFromFixture({
        session: {
          // @ts-expect-error Runtime validation also protects JavaScript consumers.
          activeUserEmail: 42,
        },
      }),
    ).toThrow("Invalid runtime data in inline:session: activeUserEmail:");

    expect(() =>
      createRuntimeDataSnapshotFromFixture({
        spreadsheets: [
          {
            id: "budget",
            name: "Budget",
            sheets: [
              {
                id: 1,
                name: "Sheet1",
                maxRows: 0,
                maxColumns: 10,
              },
            ],
          },
        ],
      }),
    ).toThrow("Invalid runtime data in inline:spreadsheets[0]: sheets[0].maxRows:");
  });

  test("reject unknown inline fixture fields", () => {
    expect(() =>
      createRuntimeDataSnapshotFromFixture({
        properties: {
          scriptProperties: {
            environment: "test",
          },
        },
        // @ts-expect-error Runtime validation rejects unknown fields from JavaScript consumers.
        unknown: true,
      }),
    ).toThrow("Invalid runtime data in inline fixture: fixture:");
  });
});
