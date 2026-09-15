import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { createBuilder } from "vite";
import { describe, expect, test } from "vitest";

import type { BuildPlan } from "../../plan";
import { VIRTUAL_DETECT_SERVER_ENTRY, detectServerEntry } from "./detectserverentry";

function createPlan(
  root: string,
  clientSources: readonly string[],
  serverSources: readonly string[],
): BuildPlan {
  return {
    root,
    outputDir: path.join(root, "dist"),
    appType: "spa",
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

      fs.writeFileSync(mainSource, `import "../server/Code";`);
      fs.writeFileSync(adminSource, `import "../../server/Code";`);
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

      fs.writeFileSync(mainSource, `import "../server/a/Code";`);
      fs.writeFileSync(adminSource, `import "../../server/b/Code";`);
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
});
