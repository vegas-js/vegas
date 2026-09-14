import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { collectSources } from "./scan";
import type { ResolvedProject } from "./type";

function createProject(tempDirPath: string): ResolvedProject {
  return {
    root: tempDirPath,
    configFile: null,
    clientDir: path.join(tempDirPath, "src", "client"),
    serverDir: path.join(tempDirPath, "src", "server"),
    gasMockDir: path.join(tempDirPath, "mock"),
    outputDir: path.join(tempDirPath, "dist"),
    appType: "spa",
    plugins: [],
    gas: {
      exceptionLogging: "STACKDRIVER",
      runtimeVersion: "V8",
      timeZone: "UTC",
      webapp: {
        access: "MYSELF",
        executeAs: "USER_ACCESSING",
      },
    },
  };
}

describe("collectSources", () => {
  test("collect project sources", async () => {
    const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      const project = createProject(tempDirPath);

      fs.mkdirSync(path.join(project.clientDir, "admin"), { recursive: true });
      fs.mkdirSync(project.serverDir, { recursive: true });
      fs.mkdirSync(project.gasMockDir, { recursive: true });

      const files = {
        client: ["main.tsx", "helper.ts", "types.d.ts", path.join("admin", "main.tsx")],
        server: ["Code.ts", "types.d.ts"],
        mock: ["properties.ts", "types.d.ts"],
      };

      for (const file of files.client) {
        fs.writeFileSync(path.join(project.clientDir, file), "");
      }
      for (const file of files.server) {
        fs.writeFileSync(path.join(project.serverDir, file), "");
      }
      for (const file of files.mock) {
        fs.writeFileSync(path.join(project.gasMockDir, file), "");
      }

      const sources = await collectSources(project);

      expect(sources).toStrictEqual({
        clientSources: [
          path.join(project.clientDir, "admin", "main.tsx"),
          path.join(project.clientDir, "helper.ts"),
          path.join(project.clientDir, "main.tsx"),
        ],
        serverSources: [path.join(project.serverDir, "Code.ts")],
        gasMockSources: [path.join(project.gasMockDir, "properties.ts")],
      });
    } finally {
      fs.rmSync(tempDirPath, {
        recursive: true,
        force: true,
      });
    }
  });

  test("return empty sources when project directories do not exist", async () => {
    const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      const project = createProject(tempDirPath);
      const sources = await collectSources(project);

      expect(sources).toStrictEqual({
        clientSources: [],
        serverSources: [],
        gasMockSources: [],
      });
    } finally {
      fs.rmSync(tempDirPath, {
        recursive: true,
        force: true,
      });
    }
  });
});
