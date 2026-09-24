import { describe, expect, test } from "vitest";

import { HostDispatcher } from "./host-dispatcher";
import { InMemoryPropertiesStore } from "./in-memory-properties-store";
import { PropertiesHostHandler } from "./properties-host-handler";
import { RuntimeInfrastructureError } from "./runtime-infrastructure-error";

function createDispatcher(): HostDispatcher {
  return new HostDispatcher({
    properties: new PropertiesHostHandler(new InMemoryPropertiesStore(), {
      scriptKey: "script",
      userKey: "user",
    }),
  });
}

describe("HostDispatcher failures", () => {
  test("classify a missing invocation handler as a backend failure", async () => {
    const dispatcher = createDispatcher();
    let caught: unknown;

    try {
      await dispatcher.dispatch({
        service: "cache",
        operation: "get",
        namespace: "script",
        key: "name",
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(RuntimeInfrastructureError);
    expect(caught).toMatchObject({
      kind: "backend",
      message: "Cache host handler is not configured for this invocation.",
    });
  });
});
