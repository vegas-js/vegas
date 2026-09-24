import { describe, expect, test } from "vitest";

import type { AppsScriptWorkerResponse } from "../runtime/node/apps-script-worker-protocol";
import { handleAppsScriptWorkerInvocation } from "./invocation";

class FailingOncePort {
  readonly messages: AppsScriptWorkerResponse[] = [];
  closeCount = 0;
  #failed = false;

  postMessage(value: AppsScriptWorkerResponse): void {
    if (!this.#failed) {
      this.#failed = true;
      throw new DOMException("could not clone", "DataCloneError");
    }

    this.messages.push(value);
  }

  close(): void {
    this.closeCount += 1;
  }
}

describe("Apps Script worker result serialization", () => {
  test("replace an unserializable success result with a serialization failure", async () => {
    const port = new FailingOncePort();

    await handleAppsScriptWorkerInvocation(
      port,
      {
        main() {
          return () => "not cloneable";
        },
      },
      {
        type: "invoke",
        functionName: "main",
        args: [],
      },
    );

    expect(port.messages).toHaveLength(1);
    expect(port.messages[0]).toMatchObject({
      type: "result",
      ok: false,
      error: {
        name: "RuntimeInfrastructureError",
        message: "Apps Script worker result could not be serialized.",
        infrastructureKind: "serialization",
      },
    });
    expect(port.closeCount).toBe(1);
  });
});
