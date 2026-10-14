import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

import { createBuilder, type Rolldown } from "vite";
import { describe, expect, test } from "vitest";

import { exportBridge } from "./exportbridge";

const internalRpcEntrypoint = fileURLToPath(
  new URL("../../../../apps-script/rpc-dispatcher.ts", import.meta.url),
);
const serverFunctionsEntrypoint = fileURLToPath(
  new URL("../../../../apps-script/server-functions.ts", import.meta.url),
);

async function buildRegisteredRpc(): Promise<string> {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-rpc-registered-snapshot-"));
  try {
    const entry = path.join(root, "Code.ts");
    fs.writeFileSync(
      entry,
      `
        import { defineServerFunctions } from "@vegasjs/vegas/server";

        export const rpc = defineServerFunctions<{ greet(): string }>({
          greet() { return "original"; },
        });

        export function changeRegistry() {
          Object.assign(rpc, {
            greet: () => "replacement",
            added: () => "added",
          });
        }
      `,
    );
    const builder = await createBuilder({
      root,
      configFile: false,
      plugins: [
        {
          name: "test-resolve-vegas-rpc-registrations",
          resolveId(id) {
            if (id === "@vegasjs/vegas/__internal/rpc") {
              return internalRpcEntrypoint;
            }
            if (id === "@vegasjs/vegas/server") {
              return serverFunctionsEntrypoint;
            }
          },
        },
        exportBridge(),
      ],
      environments: {
        server: {
          build: { lib: { entry, formats: ["iife"], name: "GASApp" } },
        },
      },
      build: { write: false },
      logLevel: "silent",
    });
    const result = await builder.build(builder.environments.server);
    const outputs = (Array.isArray(result) ? result : [result]) as Rolldown.RolldownOutput[];
    const script = outputs
      .flatMap((item) => item.output)
      .find((item) => item.type === "chunk" && item.isEntry);
    if (!script || script.type !== "chunk") {
      throw new Error("Expected the GAS server entry chunk.");
    }
    return script.code;
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

describe("registered RPC handler snapshots", () => {
  test("rejects a modified registry in the bundled GAS dispatcher", async () => {
    const code = await buildRegisteredRpc();
    const context = vm.createContext({});
    new vm.Script(code).runInContext(context);

    expect(vm.runInContext('vegasRpcCall("greet")', context)).toBe("original");
    vm.runInContext("changeRegistry()", context);
    expect(() => vm.runInContext('vegasRpcCall("greet")', context)).toThrow(
      "Unknown or private RPC handler: greet",
    );
    expect(() => vm.runInContext('vegasRpcCall("added")', context)).toThrow(
      "Unknown or private RPC handler: added",
    );
  });
});
