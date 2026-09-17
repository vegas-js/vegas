import { describe, expect, test } from "vitest";

import {
  createHostResponse,
  HostDispatcher,
  InMemoryPropertiesStore,
  PropertiesHostHandler,
} from "./index";

function createDispatcher() {
  return new HostDispatcher({
    properties: new PropertiesHostHandler(new InMemoryPropertiesStore(), {
      scriptKey: "script",
      userKey: "user",
    }),
  });
}

describe("createHostResponse", () => {
  test("wrap successful host results with the request id", async () => {
    const dispatcher = createDispatcher();

    await dispatcher.dispatch({
      service: "properties",
      operation: "set",
      namespace: "script",
      key: "name",
      value: "Vegas",
    });

    await expect(
      createHostResponse(dispatcher, {
        id: 17,
        call: {
          service: "properties",
          operation: "get",
          namespace: "script",
          key: "name",
        },
      }),
    ).resolves.toStrictEqual({
      id: 17,
      ok: true,
      value: "Vegas",
    });
  });

  test("serialize host failures instead of rejecting the transport request", async () => {
    const dispatcher = createDispatcher();

    const response = await createHostResponse(dispatcher, {
      id: 18,
      call: {
        service: "drive",
        operation: "get-root-folder",
      },
    });

    expect(response).toMatchObject({
      id: 18,
      ok: false,
      error: {
        name: "Error",
        type: "Error",
        message: "Drive host handler is not configured for this invocation.",
      },
    });
  });
});
