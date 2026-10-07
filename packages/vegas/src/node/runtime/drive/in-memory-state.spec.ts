import { describe, expect, test } from "vitest";

import { createDriveState, createNamespaceKey } from "./in-memory-state";

describe("in-memory Drive state", () => {
  test("construct an empty Drive with deterministic root state", () => {
    const state = createDriveState("drive-root:7", 1234);

    expect(state.root).toStrictEqual({
      reference: {
        service: "drive",
        kind: "folder",
        id: "drive-root:7",
      },
      description: null,
      name: null,
      parentIds: [],
      starred: false,
      timestamps: {
        createdAtMillis: 1234,
        lastUpdatedAtMillis: 1234,
      },
      trashed: false,
    });
    expect(state.files).toStrictEqual(new Map());
    expect(state.folders).toStrictEqual(new Map());
  });

  test("create independent mutable collections for each Drive", () => {
    const first = createDriveState("drive-root:1", 1);
    const second = createDriveState("drive-root:2", 2);

    expect(first.files).not.toBe(second.files);
    expect(first.folders).not.toBe(second.folders);
    expect(first.root).not.toBe(second.root);
  });

  test("create stable namespace keys without collisions between user keys", () => {
    expect(createNamespaceKey({ userKey: "user-a" })).toBe(
      createNamespaceKey({ userKey: "user-a" }),
    );
    expect(createNamespaceKey({ userKey: "user-a" })).not.toBe(
      createNamespaceKey({ userKey: "user-b" }),
    );
  });
});
