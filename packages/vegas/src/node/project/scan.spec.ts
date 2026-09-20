import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { scanProject, scanRuntimeDataSources } from "./scan";
import type { ResolvedProject } from "./type";

function createProject(tempDirPath: string, appType: "spa" | "script" = "spa"): ResolvedProject {
  return {
    root: tempDirPath,
    configFile: null,
    clientDir: path.join(tempDirPath, "src", "client"),
    serverDir: path.join(tempDirPath, "src", "server"),
    runtimeDataDir: path.join(tempDirPath, "runtime"),
    outputDir: path.join(tempDirPath, "dist"),
    appType,
    plugins: [],

    appsScript: {
      manifest: {
        exceptionLogging: "STACKDRIVER",
        runtimeVersion: "V8",
        timeZone: "UTC",
        webapp: {
          access: "MYSELF",
          executeAs: "USER_ACCESSING",
        },
      },
    },
  };
}

describe("scanProject", () => {
  test("create project snapshot", async () => {
    const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      const project = createProject(tempDirPath);

      fs.mkdirSync(path.join(project.clientDir, "admin"), { recursive: true });
      fs.mkdirSync(project.serverDir, { recursive: true });
      fs.mkdirSync(project.runtimeDataDir, { recursive: true });

      const files = {
        client: ["main.tsx", "helper.ts", "types.d.ts", path.join("admin", "main.tsx")],
        server: ["Code.ts", "types.d.ts"],
        runtimeData: ["properties.ts", "types.d.ts"],
      };

      for (const file of files.client) {
        fs.writeFileSync(path.join(project.clientDir, file), "");
      }
      for (const file of files.server) {
        fs.writeFileSync(path.join(project.serverDir, file), "");
      }
      for (const file of files.runtimeData) {
        fs.writeFileSync(path.join(project.runtimeDataDir, file), "");
      }

      const snapshot = await scanProject(project);

      expect(snapshot).toStrictEqual({
        clientSources: [
          path.join(project.clientDir, "admin", "main.tsx"),
          path.join(project.clientDir, "helper.ts"),
          path.join(project.clientDir, "main.tsx"),
        ],
        serverSources: [path.join(project.serverDir, "Code.ts")],
        runtimeDataSources: [path.join(project.runtimeDataDir, "properties.ts")],
        clientEntries: [
          {
            id: "admin",
            sourcePath: path.join(project.clientDir, "admin", "main.tsx"),
            htmlPath: "admin.html",
          },
          {
            id: "index",
            sourcePath: path.join(project.clientDir, "main.tsx"),
            htmlPath: "index.html",
          },
        ],
      });
    } finally {
      fs.rmSync(tempDirPath, {
        recursive: true,
        force: true,
      });
    }
  });

  test("rescan current runtime data sources independently", async () => {
    const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      const project = createProject(tempDirPath);
      fs.mkdirSync(project.runtimeDataDir, { recursive: true });

      const first = path.join(project.runtimeDataDir, "a.ts");
      const second = path.join(project.runtimeDataDir, "b.ts");
      const declaration = path.join(project.runtimeDataDir, "types.d.ts");

      fs.writeFileSync(second, "");
      fs.writeFileSync(first, "");
      fs.writeFileSync(declaration, "");

      await expect(scanRuntimeDataSources(project)).resolves.toStrictEqual([first, second]);

      fs.rmSync(first);

      await expect(scanRuntimeDataSources(project)).resolves.toStrictEqual([second]);
    } finally {
      fs.rmSync(tempDirPath, {
        recursive: true,
        force: true,
      });
    }
  });

  test("return empty snapshot when project directories do not exist", async () => {
    const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      const project = createProject(tempDirPath);
      const snapshot = await scanProject(project);

      expect(snapshot).toStrictEqual({
        clientSources: [],
        serverSources: [],
        runtimeDataSources: [],
        clientEntries: [],
      });
    } finally {
      fs.rmSync(tempDirPath, {
        recursive: true,
        force: true,
      });
    }
  });

  test("do not create client entries for script project", async () => {
    const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      const project = createProject(tempDirPath, "script");

      fs.mkdirSync(path.join(project.clientDir, "admin"), { recursive: true });

      const files = {
        client: ["main.tsx", "helper.ts", "types.d.ts", path.join("admin", "main.tsx")],
      };

      for (const file of files.client) {
        fs.writeFileSync(path.join(project.clientDir, file), "");
      }

      const snapshot = await scanProject(project);

      expect(snapshot.clientEntries).toStrictEqual([]);
    } finally {
      fs.rmSync(tempDirPath, {
        recursive: true,
        force: true,
      });
    }
  });
});
