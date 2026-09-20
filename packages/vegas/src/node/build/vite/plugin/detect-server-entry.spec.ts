import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { createBuilder } from "vite";
import { describe, expect, test } from "vitest";

import type { BuildPlan } from "../../plan";
import { VIRTUAL_DETECT_SERVER_ENTRY, detectServerEntry } from "./detect-server-entry";

function createPlan(
  root: string,
  clientSources: readonly string[],
  serverSources: readonly string[],
  appType: "spa" | "script" = "spa",
): BuildPlan {
  return {
    root,
    outputDir: path.join(root, "dist"),
    appType,
    mode: "production",
    plugins: [],
    clientEntries: [],
    clientSources,
    serverSources,
  };
}

async function buildServer(plan: BuildPlan) {
  const builder = await createBuilder({
    root: plan.root,
    configFile: false,
    plugins: [detectServerEntry(plan)],
    environments: {
      server: {
        build: {
          lib: {
            formats: ["iife"],
            name: "GASApp",
            entry: VIRTUAL_DETECT_SERVER_ENTRY,
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

describe("detectServerEntry", () => {
  test("allow multiple clients to import the same server entry", async () => {
    const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      const clientDir = path.join(tempDirPath, "src", "client");
      const serverDir = path.join(tempDirPath, "src", "server");

      const mainSource = path.join(clientDir, "main.ts");
      const adminSource = path.join(clientDir, "admin", "main.ts");
      const serverSource = path.join(serverDir, "Code.ts");

      fs.mkdirSync(path.dirname(adminSource), { recursive: true });
      fs.mkdirSync(serverDir, { recursive: true });

      fs.writeFileSync(mainSource, `import type * as Server from "../server/Code";`);
      fs.writeFileSync(adminSource, `import type * as Server from "../../server/Code";`);
      fs.writeFileSync(serverSource, `export function doGet() { return "ok"; }`);

      const plan = createPlan(tempDirPath, [mainSource, adminSource], [serverSource]);

      await expect(buildServer(plan)).resolves.toBeDefined();
    } finally {
      fs.rmSync(tempDirPath, {
        recursive: true,
        force: true,
      });
    }
  });

  test.each([
    ["value import", 'import { doGet } from "../server/Code";'],
    ["value re-export", 'export { doGet } from "../server/Code";'],
    ["export all", 'export * from "../server/Code";'],
    ["dynamic import", 'void import("../server/Code");'],
  ])("reject %s of server source", async (_case, source) => {
    const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      const clientDir = path.join(tempDirPath, "src", "client");
      const serverDir = path.join(tempDirPath, "src", "server");
      const clientSource = path.join(clientDir, "main.ts");
      const serverSource = path.join(serverDir, "Code.ts");

      fs.mkdirSync(clientDir, { recursive: true });
      fs.mkdirSync(serverDir, { recursive: true });

      fs.writeFileSync(clientSource, source);
      fs.writeFileSync(serverSource, `export function doGet() { return "ok"; }`);

      const plan = createPlan(tempDirPath, [clientSource], [serverSource]);

      await expect(buildServer(plan)).rejects.toThrow(
        "Server sources may only be referenced from client code as types.",
      );
    } finally {
      fs.rmSync(tempDirPath, {
        recursive: true,
        force: true,
      });
    }
  });

  test("allow specifier-level type-only import of server entry", async () => {
    const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      const clientDir = path.join(tempDirPath, "src", "client");
      const serverDir = path.join(tempDirPath, "src", "server");
      const clientSource = path.join(clientDir, "main.ts");
      const serverSource = path.join(serverDir, "Code.ts");

      fs.mkdirSync(clientDir, { recursive: true });
      fs.mkdirSync(serverDir, { recursive: true });

      fs.writeFileSync(clientSource, `import { type doGet } from "../server/Code";`);
      fs.writeFileSync(serverSource, `export function doGet() { return "ok"; }`);

      const plan = createPlan(tempDirPath, [clientSource], [serverSource]);

      await expect(buildServer(plan)).resolves.toBeDefined();
    } finally {
      fs.rmSync(tempDirPath, {
        recursive: true,
        force: true,
      });
    }
  });

  test("allow type-only re-export of server entry", async () => {
    const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      const clientDir = path.join(tempDirPath, "src", "client");
      const serverDir = path.join(tempDirPath, "src", "server");
      const clientSource = path.join(clientDir, "main.ts");
      const serverSource = path.join(serverDir, "Code.ts");

      fs.mkdirSync(clientDir, { recursive: true });
      fs.mkdirSync(serverDir, { recursive: true });

      fs.writeFileSync(clientSource, `export type { doGet } from "../server/Code";`);
      fs.writeFileSync(serverSource, `export function doGet() { return "ok"; }`);

      const plan = createPlan(tempDirPath, [clientSource], [serverSource]);

      await expect(buildServer(plan)).resolves.toBeDefined();
    } finally {
      fs.rmSync(tempDirPath, {
        recursive: true,
        force: true,
      });
    }
  });

  test("reject query-suffixed imports of non-entry server sources", async () => {
    const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      const clientDir = path.join(tempDirPath, "src", "client");
      const serverDir = path.join(tempDirPath, "src", "server");
      const clientSource = path.join(clientDir, "main.ts");
      const serverEntry = path.join(serverDir, "Code.ts");
      const serverHelper = path.join(serverDir, "helper.ts");

      fs.mkdirSync(clientDir, { recursive: true });
      fs.mkdirSync(serverDir, { recursive: true });

      fs.writeFileSync(clientSource, `import type { secret } from "../server/helper?server";`);
      fs.writeFileSync(serverEntry, `export function doGet() { return "ok"; }`);
      fs.writeFileSync(serverHelper, `export const secret = "server-only";`);

      const plan = createPlan(tempDirPath, [clientSource], [serverEntry, serverHelper]);

      await expect(buildServer(plan)).rejects.toThrow(
        "The only file that can be imported from the server side is Code.ts",
      );
    } finally {
      fs.rmSync(tempDirPath, {
        recursive: true,
        force: true,
      });
    }
  });

  test("reject multiple different server entries", async () => {
    const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      const clientDir = path.join(tempDirPath, "src", "client");
      const serverDir = path.join(tempDirPath, "src", "server");
      const mainSource = path.join(clientDir, "main.ts");
      const adminSource = path.join(clientDir, "admin", "main.ts");

      const serverA = path.join(serverDir, "a", "Code.ts");
      const serverB = path.join(serverDir, "b", "Code.ts");

      fs.mkdirSync(path.dirname(adminSource), { recursive: true });
      fs.mkdirSync(path.dirname(serverA), { recursive: true });
      fs.mkdirSync(path.dirname(serverB), { recursive: true });

      fs.writeFileSync(mainSource, `import type * as ServerA from "../server/a/Code";`);
      fs.writeFileSync(adminSource, `import type * as ServerB from "../../server/b/Code";`);
      fs.writeFileSync(serverA, `export function a() {}`);
      fs.writeFileSync(serverB, `export function b() {}`);

      const plan = createPlan(tempDirPath, [mainSource, adminSource], [serverA, serverB]);

      await expect(buildServer(plan)).rejects.toThrow("Duplicate server entry.");
    } finally {
      fs.rmSync(tempDirPath, {
        recursive: true,
        force: true,
      });
    }
  });

  test("reject multiple fallback server entries", async () => {
    const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      const clientDir = path.join(tempDirPath, "src", "client");
      const serverDir = path.join(tempDirPath, "src", "server");
      const clientSource = path.join(clientDir, "main.ts");

      const serverA = path.join(serverDir, "a", "Code.ts");
      const serverB = path.join(serverDir, "b", "Code.ts");

      fs.mkdirSync(path.dirname(clientSource), { recursive: true });
      fs.mkdirSync(path.dirname(serverA), { recursive: true });
      fs.mkdirSync(path.dirname(serverB), { recursive: true });

      fs.writeFileSync(clientSource, `console.log("client");`);
      fs.writeFileSync(serverA, `export function a() {}`);
      fs.writeFileSync(serverB, `export function b() {}`);

      const plan = createPlan(tempDirPath, [clientSource], [serverA, serverB]);

      await expect(buildServer(plan)).rejects.toThrow("Duplicate server entry.");
    } finally {
      fs.rmSync(tempDirPath, {
        recursive: true,
        force: true,
      });
    }
  });

  test("does not fall back outside scanned server sources for script project", async () => {
    const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      const staleDefaultEntry = path.join(tempDirPath, "src", "Code.ts");

      fs.mkdirSync(path.dirname(staleDefaultEntry), { recursive: true });
      fs.writeFileSync(staleDefaultEntry, `export function stale() {}`);

      const plan = createPlan(tempDirPath, [], [], "script");

      await expect(buildServer(plan)).rejects.toThrow(
        "No server entry found. Place Code.ts under serverDir.",
      );
    } finally {
      fs.rmSync(tempDirPath, {
        recursive: true,
        force: true,
      });
    }
  });
});
