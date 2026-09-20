import { describe, expect, test } from "vitest";

import type { AppsScriptWorkerResponse } from "../runtime/node/apps-script-worker-protocol";
import { handleAppsScriptWorkerInvocation } from "./invocation";

class TestPort {
  readonly messages: AppsScriptWorkerResponse[] = [];
  closeCount = 0;

  postMessage(value: AppsScriptWorkerResponse): void {
    this.messages.push(value);
  }

  close(): void {
    this.closeCount += 1;
  }
}

describe("handleAppsScriptWorkerInvocation", () => {
  test("post a successful result and close the port", async () => {
    const port = new TestPort();

    await handleAppsScriptWorkerInvocation(
      port,
      {
        async main(value: string) {
          return `Hello ${value}`;
        },
      },
      {
        type: "invoke",
        functionName: "main",
        args: ["Vegas"],
      },
    );

    expect(port.messages).toStrictEqual([
      {
        type: "result",
        ok: true,
        value: "Hello Vegas",
      },
    ]);
    expect(port.closeCount).toBe(1);
  });

  test("post a failed result and close the port", async () => {
    const port = new TestPort();

    await handleAppsScriptWorkerInvocation(
      port,
      {
        main() {
          throw new TypeError("failed");
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
        name: "TypeError",
        message: "failed",
      },
    });
    expect(port.closeCount).toBe(1);
  });

  test("reject invalid invocation requests through the worker protocol", async () => {
    const port = new TestPort();

    await handleAppsScriptWorkerInvocation(port, {}, { type: "unknown" });

    expect(port.messages).toHaveLength(1);
    expect(port.messages[0]).toMatchObject({
      type: "result",
      ok: false,
      error: {
        name: "Error",
        message: "Invalid Apps Script worker invocation request.",
      },
    });
    expect(port.closeCount).toBe(1);
  });

  test("close the port when posting the result fails", async () => {
    const port = {
      closeCount: 0,
      postMessage() {
        throw new Error("post failed");
      },
      close() {
        this.closeCount += 1;
      },
    };

    await expect(
      handleAppsScriptWorkerInvocation(
        port,
        {
          main() {
            return "result";
          },
        },
        {
          type: "invoke",
          functionName: "main",
          args: [],
        },
      ),
    ).rejects.toThrow("post failed");

    expect(port.closeCount).toBe(1);
  });
});
