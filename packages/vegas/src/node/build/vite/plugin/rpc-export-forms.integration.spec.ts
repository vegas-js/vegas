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

async function buildServer(
  entrySource: string,
  helperSource?: string,
  helperFileName = "handlers.ts",
): Promise<string> {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-rpc-export-forms-"));

  try {
    const entry = path.join(root, "Code.ts");
    fs.writeFileSync(entry, entrySource);
    if (helperSource !== undefined) {
      const helperPath = path.join(root, helperFileName);
      fs.mkdirSync(path.dirname(helperPath), { recursive: true });
      fs.writeFileSync(helperPath, helperSource);
    }

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
        exportBridge((filePath) => filePath === entry),
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

  test.each([
    [
      "type-only named re-export",
      'export type { rpc } from "./handlers"; export function legacy(name: string) { return "Hello, " + name; }',
      "export interface rpc { greet(name: string): string }",
    ],
    [
      "type-only specifier",
      'export { type rpc } from "./handlers"; export function legacy(name: string) { return "Hello, " + name; }',
      "export interface rpc { greet(name: string): string }",
    ],
    [
      "type-only star re-export",
      'export type * from "./handlers"; export function legacy(name: string) { return "Hello, " + name; }',
      "export interface rpc { greet(name: string): string }",
    ],
    [
      "mixed type and value re-exports",
      'export { type rpc, legacy } from "./handlers";',
      'export type rpc = { greet(name: string): string }; export function legacy(name: string) { return "Hello, " + name; }',
    ],
  ] as const)("does not inject RPC dispatcher for %s", async (_description, entry, helper) => {
    const code = await buildServer(entry, helper);
    const context = vm.createContext({});
    new vm.Script(code).runInContext(context);

    expect(vm.runInContext('legacy("Vegas")', context)).toBe("Hello, Vegas");
    expect(code).not.toContain("function vegasRpcCall(");
    expect(code).not.toContain("__vegasInternalRpcDispatch");
  });

  test("ignores a type-only export with the reserved internal dispatcher name", async () => {
    const code = await buildServer(
      'export const rpc = { greet() { return "Hello, Vegas"; } }; export type { __vegasInternalRpcDispatch } from "./handlers";',
      "export type __vegasInternalRpcDispatch = string;",
    );
    const context = vm.createContext({});
    new vm.Script(code).runInContext(context);

    expect(vm.runInContext('vegasRpcCall("greet")', context)).toBe("Hello, Vegas");
  });

  test("transforms the entry but not an imported Code.ts module", async () => {
    const code = await buildServer(
      'export * from "./feature/Code";',
      'export const rpc = { greet(name: string) { return "Hello, " + name; } };',
      "feature/Code.ts",
    );
    const context = vm.createContext({});
    new vm.Script(code).runInContext(context);
    expect(vm.runInContext('vegasRpcCall("greet", "Vegas")', context)).toBe("Hello, Vegas");
  });

  test("rejects a user-defined internal RPC dispatcher export", async () => {
    await expect(
      buildServer(`
        export const rpc = { greet() { return "ok"; } };
        export function __vegasInternalRpcDispatch() { return "conflict"; }
      `),
    ).rejects.toThrow('Server export "__vegasInternalRpcDispatch" is reserved for Vegas RPC.');
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
