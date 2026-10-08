import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

import { createBuilder, type Rolldown } from "vite";
import { describe, expect, test } from "vitest";

import { exportBridge } from "./exportbridge";

const serverEntrypoint = fileURLToPath(
  new URL("../../../../entrypoints/server.ts", import.meta.url),
);

async function buildServer(entrySource: string, helperSource?: string): Promise<string> {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-rpc-export-forms-"));

  try {
    const entry = path.join(root, "Code.ts");
    fs.writeFileSync(entry, entrySource);
    if (helperSource !== undefined) {
      fs.writeFileSync(path.join(root, "handlers.ts"), helperSource);
    }

    const builder = await createBuilder({
      root,
      configFile: false,
      plugins: [
        {
          name: "test-resolve-vegas-server",
          resolveId(id) {
            if (id === "@vegasjs/vegas/server") {
              return serverEntrypoint;
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
      throw new Error("Expected a GAS server entry chunk.");
    }

    return script.code;
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

describe("registered RPC export forms", () => {
  test.each([
    [
      "destructured declaration",
      'export const { rpc } = { rpc: { greet(name: string) { return "Hello, " + name; } } };',
      undefined,
    ],
    [
      "renamed destructured binding",
      'export const { handlers: rpc } = { handlers: { greet(name: string) { return "Hello, " + name; } } };',
      undefined,
    ],
    [
      "star re-export",
      'export * from "./handlers";',
      'export const rpc = { greet(name: string) { return "Hello, " + name; } };',
    ],
    [
      "explicit re-export",
      'export { rpc } from "./handlers";',
      'export const rpc = { greet(name: string) { return "Hello, " + name; } };',
    ],
  ] as const)("bundles RPC dispatch for %s", async (_description, entry, helper) => {
    const code = await buildServer(entry, helper);
    const context = vm.createContext({});
    new vm.Script(code).runInContext(context);

    expect(vm.runInContext('vegasRpcCall("greet", "Vegas")', context)).toBe("Hello, Vegas");
    expect(code).not.toContain("function rpc(...args)");
    expect(code).not.toContain("function __vegasInternalRpcDispatch(...args)");
  });

  test("preserves named exports when a star re-export does not expose rpc", async () => {
    const code = await buildServer(
      'export * from "./handlers";',
      'export function legacy(name: string) { return "Hello, " + name; }',
    );
    const context = vm.createContext({});
    new vm.Script(code).runInContext(context);

    expect(vm.runInContext('legacy("Vegas")', context)).toBe("Hello, Vegas");
    expect(code).not.toContain("function vegasRpcCall(");
  });
});
