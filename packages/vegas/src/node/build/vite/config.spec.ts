import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";

import { createBuilder } from "vite";
import { describe, expect, test } from "vitest";

import type { BuildPlan } from "../plan";
import { buildApp } from "./build";
import { createBuilderConfig } from "./config";

const fsRoot = path.parse(process.cwd()).root;
const root = path.join(fsRoot, "home", "user", "project");

function createPlan(mode: "development" | "production"): BuildPlan {
  return {
    root,
    outputDir: path.join(root, "dist"),
    appType: "spa",
    mode,
    plugins: [],
    clientModuleTargets: [],
    clientHtmlTargets: [],
    clientSources: [],
    serverSources: [],
  };
}

describe("createBuilderConfig", () => {
  test("set vite mode from build plan", () => {
    const config = createBuilderConfig(createPlan("development"));

    expect(config.mode).toBe("development");
  });

  test("bundle server dependencies without changing the server consumer", () => {
    const config = createBuilderConfig(createPlan("production"));
    const server = config.environments?.server;

    expect(server?.consumer).toBeUndefined();
    expect(server?.resolve?.noExternal).toBe(true);
    expect(server?.build?.lib).toEqual({
      formats: ["iife"],
      name: "GASApp",
      entry: "virtual:detectserverentry",
    });
  });

  test("bundle server package imports into GAS globals in the server environment", async () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-gas-bundle-"));

    try {
      // This fixture deliberately resolves through node_modules. A test resolver pointing
      // directly at a source file would hide the externalization regression.
      const packageDir = path.join(projectRoot, "node_modules", "@vegasjs", "vegas");
      fs.mkdirSync(packageDir, { recursive: true });
      fs.writeFileSync(
        path.join(packageDir, "package.json"),
        JSON.stringify({
          name: "@vegasjs/vegas",
          type: "module",
          exports: { "./server": "./server.js" },
        }),
      );
      fs.writeFileSync(
        path.join(packageDir, "server.js"),
        "export function defineServerFunctions(handlers) { return handlers; }\n",
      );

      const entryPath = path.join(projectRoot, "Code.ts");
      fs.writeFileSync(
        entryPath,
        `
          import { defineServerFunctions } from "@vegasjs/vegas/server";

          export const rpc = defineServerFunctions({
            greet(name: string) {
              return "Hello, " + name;
            },
          });
          export function legacy(name: string) {
            return "Legacy: " + name;
          }
        `,
      );

      const plan: BuildPlan = {
        root: projectRoot,
        outputDir: path.join(projectRoot, "dist"),
        appType: "script",
        mode: "production",
        plugins: [],
        clientModuleTargets: [],
        clientHtmlTargets: [],
        clientSources: [],
        serverSources: [entryPath],
      };
      const builder = await createBuilder(createBuilderConfig(plan));
      const artifacts = await buildApp(builder, /^server$/);
      const server = artifacts.find((artifact) => artifact.path.endsWith(".js"));

      expect(server).toBeDefined();
      if (!server || typeof server.content !== "string") {
        throw new Error("Expected a JavaScript GAS server bundle.");
      }

      // No _vegasjs_vegas_server or other injected package global is provided.
      const context = vm.createContext({});
      new vm.Script(server.content).runInContext(context);
      expect(vm.runInContext('vegasRpcCall("greet", "Vegas")', context)).toBe("Hello, Vegas");
      expect(vm.runInContext('legacy("Vegas")', context)).toBe("Legacy: Vegas");
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });
});
