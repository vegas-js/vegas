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

describe("namespace RPC exports", () => {
  test.each([
    ["identifier", 'export * as rpc from "./handlers";'],
    ["quoted", 'export * as "rpc" from "./handlers";'],
  ])("dispatches %s namespace exports through GAS", async (_form, source) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-rpc-namespace-"));

    try {
      const entry = path.join(root, "Code.ts");
      fs.writeFileSync(entry, source);
      fs.writeFileSync(
        path.join(root, "handlers.ts"),
        [
          'export function greet(name: string) { return "Hello, " + name; }',
          'export function hidden_() { return "private"; }',
          "export const version = 1;",
        ].join("\n"),
      );

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

      const context = vm.createContext({});
      new vm.Script(script.code).runInContext(context);

      expect(vm.runInContext('vegasRpcCall("greet", "Vegas")', context)).toBe("Hello, Vegas");
      expect(() => vm.runInContext('vegasRpcCall("hidden_")', context)).toThrow(
        "Unknown or private RPC handler",
      );
      expect(() => vm.runInContext('vegasRpcCall("version")', context)).toThrow(
        "Unknown or private RPC handler",
      );
      expect(script.code).not.toContain("function rpc(...args)");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
