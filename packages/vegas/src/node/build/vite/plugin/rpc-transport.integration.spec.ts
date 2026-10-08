import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import worker from "node:worker_threads";

import { createBuilder, type Rolldown } from "vite";
import { describe, expect, test } from "vitest";

import type { AppsScriptWorkerResponse } from "../../../runtime/node/apps-script-worker-protocol";
import { handleAppsScriptWorkerInvocation } from "../../../worker/invocation";
import { createWorkerRuntimeContext, evaluateWorkerProgram } from "../../../worker/runtime-context";
import { exportBridge } from "./exportbridge";

const internalRpcEntrypoint = fileURLToPath(
  new URL("../../../../apps-script/rpc-dispatcher.ts", import.meta.url),
);

async function buildRpcDispatcher(source: string): Promise<string> {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-rpc-transport-"));

  try {
    const entry = path.join(root, "Code.ts");
    fs.writeFileSync(entry, source);

    const builder = await createBuilder({
      root,
      configFile: false,
      plugins: [
        {
          name: "test-resolve-vegas-server",
          resolveId(id) {
            if (id === "@vegasjs/vegas/__internal/rpc") {
              return internalRpcEntrypoint;
            }
          },
        },
        exportBridge(),
      ],
      environments: {
        server: {
          build: {
            lib: { entry, formats: ["iife"], name: "GASApp" },
          },
        },
      },
      build: { write: false },
      logLevel: "silent",
    });
    const result = await builder.build(builder.environments.server);
    const output = (Array.isArray(result) ? result : [result]) as Rolldown.RolldownOutput[];
    const script = output
      .flatMap((item) => item.output)
      .find((item) => item.type === "chunk" && item.isEntry);
    if (!script || script.type !== "chunk") {
      throw new Error("Expected the GAS server bundle.");
    }
    return script.code;
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

describe("registered RPC transport boundary", () => {
  test("executes bundled RPC in the Local Runtime worker VM and invocation handler", async () => {
    const code = await buildRpcDispatcher(`
      export const rpc = {
        format(name: string) { return "Hello, " + name; },
        greet(name: string) { return this.format(name); },
        hidden_() { return "private"; },
        dateResult() { return new Date(); },
      };
      export function legacy(name: string) { return "Legacy: " + name; }
    `);

    // Exercise the same VM and invocation handler as the real worker without
    // requiring worker.js, which exists only in the built package.
    const { port1, port2 } = new worker.MessageChannel();
    try {
      const program = { source: code, htmlFiles: {} };
      const context = createWorkerRuntimeContext({
        program,
        environment: {
          activeUserEmail: "",
          activeUserLocale: "en",
          effectiveUserEmail: "",
          scriptTimeZone: "UTC",
          temporaryActiveUserKey: "",
        },
        port: port1,
        sharedArray: new Int32Array(new SharedArrayBuffer(4)),
      });
      evaluateWorkerProgram(context, program.source);

      const invoke = async (functionName: string, args: readonly unknown[]) => {
        const messages: AppsScriptWorkerResponse[] = [];
        await handleAppsScriptWorkerInvocation(
          {
            postMessage(message) {
              messages.push(message);
            },
            close() {},
          },
          context,
          { type: "invoke", functionName, args },
        );
        const response = messages[0];
        if (response === undefined) {
          throw new Error("Expected an Apps Script worker response.");
        }
        return response;
      };

      await expect(invoke("vegasRpcCall", ["greet", "Vegas"])).resolves.toMatchObject({
        type: "result",
        ok: true,
        value: "Hello, Vegas",
      });
      await expect(invoke("legacy", ["Vegas"])).resolves.toMatchObject({
        type: "result",
        ok: true,
        value: "Legacy: Vegas",
      });
      await expect(invoke("vegasRpcCall", ["hidden_"])).resolves.toMatchObject({
        type: "result",
        ok: false,
        error: { message: "Unknown or private RPC handler: hidden_" },
      });
      await expect(invoke("vegasRpcCall", ["dateResult"])).resolves.toMatchObject({
        type: "result",
        ok: false,
        error: { message: "Unsupported RPC transport value at return" },
      });
    } finally {
      port1.close();
      port2.close();
    }
  });

  test("validates arguments and results in the generated GAS dispatcher", async () => {
    const code = await buildRpcDispatcher(`
      export const rpc = {
        echo(value: unknown) { return value; },
        noResult() {},
        dateResult() { return new Date(); },
        cyclicResult() {
          const value: Record<string, unknown> = {};
          value.self = value;
          return value;
        },
      };
    `);
    const context = vm.createContext({});
    new vm.Script(code).runInContext(context);
    const invoke = vm.runInContext("vegasRpcCall", context) as (
      name: string,
      ...args: unknown[]
    ) => unknown;

    expect(invoke("echo", { user: ["Vegas", 1, null] })).toStrictEqual({
      user: ["Vegas", 1, null],
    });
    expect(invoke("noResult")).toBeUndefined();
    const shared = { name: "Vegas" };
    expect(invoke("echo", { first: shared, second: shared })).toStrictEqual({
      first: shared,
      second: shared,
    });

    expect(() => invoke("echo", new Date())).toThrow(
      "Unsupported RPC transport value at arguments[0]",
    );
    expect(() => invoke("echo", () => "bad")).toThrow(
      "Unsupported RPC transport value at arguments[0]",
    );
    expect(() => invoke("echo", [undefined])).toThrow(
      "Unsupported RPC transport value at arguments[0]",
    );
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(() => invoke("echo", cyclic)).toThrow("Cyclic RPC transport value at arguments[0]");
    expect(() => invoke("dateResult")).toThrow("Unsupported RPC transport value at return");
    expect(() => invoke("cyclicResult")).toThrow("Cyclic RPC transport value at return");
  });

  test("rejects custom prototype values in the generated GAS dispatcher", async () => {
    const code = await buildRpcDispatcher(`
      export const rpc = { echo(value: unknown) { return value; } };
    `);
    const context = vm.createContext({});
    new vm.Script(code).runInContext(context);
    const invoke = vm.runInContext("vegasRpcCall", context) as (
      name: string,
      ...args: unknown[]
    ) => unknown;

    const customPrototype = Object.assign(Object.create(null) as Record<string, unknown>, {
      inherited: "lost",
    });
    const inherited = Object.assign(Object.create(customPrototype) as Record<string, unknown>, {
      name: "Vegas",
    });
    class ExtendedArray extends Array<number> {
      get inherited(): string {
        return "lost";
      }
    }
    const extended = new ExtendedArray();
    extended.push(1, 2);

    expect(() => invoke("echo", inherited)).toThrow(
      "Unsupported RPC transport value at arguments[0]",
    );
    expect(() => invoke("echo", extended)).toThrow(
      "Unsupported RPC transport value at arguments[0]",
    );
  });

  test("preserves the registered handler receiver in the GAS IIFE", async () => {
    const code = await buildRpcDispatcher(`
      export const rpc = {
        format(name: string) { return "Hello, " + name; },
        greet(name: string) { return this.format(name); },
      };
    `);
    const context = vm.createContext({});
    new vm.Script(code).runInContext(context);
    expect(vm.runInContext('vegasRpcCall("greet", "Vegas")', context)).toBe("Hello, Vegas");
  });

  test("does not execute accessor properties or reserved handlers", async () => {
    const code = await buildRpcDispatcher(`
      export const rpc = Object.defineProperty({ echo(value: unknown) { return value; } }, "unsafe", {
        get() { throw new Error("getter executed"); },
      });
    `);
    const context = vm.createContext({});
    new vm.Script(code).runInContext(context);
    const invoke = vm.runInContext("vegasRpcCall", context) as (name: string) => unknown;
    expect(() => invoke("unsafe")).toThrow("Unknown or private RPC handler: unsafe");
    expect(() => invoke("then")).toThrow("Unknown or private RPC handler: then");
  });
});
