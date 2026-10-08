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

async function buildServer(root: string, sourcePath: string) {
  const builder = await createBuilder({
    root,
    configFile: false,
    plugins: [
      {
        name: "test-resolve-vegas-server",
        resolveId(source) {
          if (source === "@vegasjs/vegas/server") {
            return serverEntrypoint;
          }
        },
      },
      exportBridge(),
    ],
    environments: {
      server: {
        build: {
          lib: {
            entry: sourcePath,
            formats: ["iife"],
            name: "GASApp",
          },
        },
      },
    },
    build: {
      write: false,
    },
    logLevel: "silent",
  });

  return builder.build(builder.environments.server);
}

describe("exportBridge", () => {
  test("expose named server exports as global functions", async () => {
    const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      const sourcePath = path.join(tempDirPath, "Code.ts");

      fs.writeFileSync(
        sourcePath,
        `
          export function hello(name: string) {
            return \`Hello, \${name}\`;
          }
        `,
      );

      const result = await buildServer(tempDirPath, sourcePath);
      const buildResults = (Array.isArray(result) ? result : [result]) as Rolldown.RolldownOutput[];
      const entry = buildResults
        .flatMap((buildResult) => buildResult.output)
        .find((output) => output.type === "chunk" && output.isEntry);

      expect(entry).toBeDefined();

      if (!entry || entry.type !== "chunk") {
        throw new Error("Expected server entry chunk");
      }

      expect(entry.code).toContain("/* Function bridge for GAS Client */");
      expect(entry.code).toContain("function hello(...args) { return GASApp.hello(...args); };");
    } finally {
      fs.rmSync(tempDirPath, {
        recursive: true,
        force: true,
      });
    }
  });

  test("exposes destructured handler exports as GAS globals", async () => {
    const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      const sourcePath = path.join(tempDirPath, "Code.ts");
      fs.writeFileSync(
        sourcePath,
        `
          const handlers = {
            greet(name: string) {
              return name;
            },
          };
          export const { greet } = handlers;
        `,
      );

      const result = await buildServer(tempDirPath, sourcePath);
      const buildResults = (Array.isArray(result) ? result : [result]) as Rolldown.RolldownOutput[];
      const entry = buildResults
        .flatMap((buildResult) => buildResult.output)
        .find((output) => output.type === "chunk" && output.isEntry);

      expect(entry?.type).toBe("chunk");
      if (!entry || entry.type !== "chunk") {
        throw new Error("Expected server entry chunk");
      }

      expect(entry.code).toContain("function greet(...args) { return GASApp.greet(...args); };");
    } finally {
      fs.rmSync(tempDirPath, { recursive: true, force: true });
    }
  });

  test("dispatches registered RPC handlers through one GAS global", async () => {
    const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      const sourcePath = path.join(tempDirPath, "Code.ts");
      fs.writeFileSync(
        sourcePath,
        `
          export function doGet() { return "web app"; }
          export const rpc = {
            greet(name: string) { return \`Hello, \${name}\`; },
            hidden_() { return "private"; },
          };
        `,
      );

      const result = await buildServer(tempDirPath, sourcePath);
      const buildResults = (Array.isArray(result) ? result : [result]) as Rolldown.RolldownOutput[];
      const entry = buildResults
        .flatMap((buildResult) => buildResult.output)
        .find((output) => output.type === "chunk" && output.isEntry);

      expect(entry?.type).toBe("chunk");
      if (!entry || entry.type !== "chunk") {
        throw new Error("Expected server entry chunk");
      }

      expect(entry.code).toContain("function vegasRpcCall(name, ...args)");
      expect(entry.code).toContain("function doGet(...args)");
      expect(entry.code).not.toContain("function rpc(...args)");

      const context = vm.createContext({});
      new vm.Script(entry.code).runInContext(context);
      const invoke = vm.runInContext("vegasRpcCall", context) as (
        name: string,
        ...args: unknown[]
      ) => unknown;

      expect(invoke("greet", "Vegas")).toBe("Hello, Vegas");
      expect(() => invoke("hidden_")).toThrow("Unknown or private RPC handler");
      expect(() => invoke("constructor")).toThrow("Unknown or private RPC handler");
      expect(() => invoke("__proto__")).toThrow("Unknown or private RPC handler");
      expect(() => invoke("missing")).toThrow("Unknown or private RPC handler");
    } finally {
      fs.rmSync(tempDirPath, { recursive: true, force: true });
    }
  });

  test("rejects a global name collision with the RPC dispatcher", async () => {
    const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      const sourcePath = path.join(tempDirPath, "Code.ts");
      fs.writeFileSync(
        sourcePath,
        `
          export const rpc = { greet() { return "ok"; } };
          export function vegasRpcCall() { return "collision"; }
        `,
      );

      await expect(buildServer(tempDirPath, sourcePath)).rejects.toThrow(
        'Server export "vegasRpcCall" conflicts with the RPC dispatcher.',
      );
    } finally {
      fs.rmSync(tempDirPath, { recursive: true, force: true });
    }
  });

  test("reject server export that cannot become a global function declaration", async () => {
    const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      const sourcePath = path.join(tempDirPath, "Code.ts");

      fs.writeFileSync(
        sourcePath,
        `
          export default function () {
            return "default";
          }
        `,
      );

      await expect(buildServer(tempDirPath, sourcePath)).rejects.toThrow(
        'Server export "default" cannot be exposed as an Apps Script function.',
      );
    } finally {
      fs.rmSync(tempDirPath, {
        recursive: true,
        force: true,
      });
    }
  });
});
