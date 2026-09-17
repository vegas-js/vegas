import { describe, expect, test } from "vitest";

import {
  HostDispatcher,
  InMemoryPropertiesStore,
  PropertiesHostHandler,
  type DriveHostCallHandler,
} from "./index";

describe("HostDispatcher", () => {
  test("dispatch properties calls to the invocation-bound handler", async () => {
    const properties = new PropertiesHostHandler(new InMemoryPropertiesStore(), {
      scriptKey: "script",
      userKey: "user",
    });
    const dispatcher = new HostDispatcher({ properties });

    await dispatcher.dispatch({
      service: "properties",
      operation: "set",
      namespace: "script",
      key: "name",
      value: "Vegas",
    });

    await expect(
      dispatcher.dispatch({
        service: "properties",
        operation: "get",
        namespace: "script",
        key: "name",
      }),
    ).resolves.toBe("Vegas");
  });

  test("dispatch drive calls only when the invocation provides a Drive handler", async () => {
    const properties = new PropertiesHostHandler(new InMemoryPropertiesStore(), {
      scriptKey: "script",
      userKey: "user",
    });
    const drive: DriveHostCallHandler = {
      async handle(call) {
        if (call.operation !== "get-root-folder") {
          throw new Error(`unexpected Drive operation: ${call.operation}`);
        }

        return {
          service: "drive",
          kind: "folder",
          id: "root",
        };
      },
    };
    const dispatcher = new HostDispatcher({ drive, properties });

    await expect(
      dispatcher.dispatch({
        service: "drive",
        operation: "get-root-folder",
      }),
    ).resolves.toStrictEqual({
      service: "drive",
      kind: "folder",
      id: "root",
    });
  });

  test("reject drive calls when the invocation has no Drive handler", async () => {
    const properties = new PropertiesHostHandler(new InMemoryPropertiesStore(), {
      scriptKey: "script",
      userKey: "user",
    });
    const dispatcher = new HostDispatcher({ properties });

    await expect(
      dispatcher.dispatch({
        service: "drive",
        operation: "get-root-folder",
      }),
    ).rejects.toThrow("Drive host handler is not configured for this invocation.");
  });
});
