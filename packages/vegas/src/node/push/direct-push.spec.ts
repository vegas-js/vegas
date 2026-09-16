import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test, vi } from "vitest";

import type { AppsScriptCredential } from "./credential";
import { pushAppsScriptProject } from "./direct-push";
import { createAppsScriptUserCredentialStore } from "./user-credential-store";

const now = 1_000_000;

const tempDirs: string[] = [];

async function createTempDir(): Promise<string> {
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "vegas-direct-push-"));
  tempDirs.push(tempDir);

  return tempDir;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((tempDir) =>
      fs.promises.rm(tempDir, {
        recursive: true,
        force: true,
      }),
    ),
  );
});

const credential: AppsScriptCredential = {
  clientId: "client-id",
  clientSecret: "client-secret",
  refreshToken: "refresh-token",
  accessToken: "access-token",
  expiryDate: now + 120_000,
  scopes: ["https://www.googleapis.com/auth/script.projects"],
};

describe("pushAppsScriptProject", () => {
  test("push built project through Apps Script API", async () => {
    const projectRoot = await createTempDir();
    const homeDir = await createTempDir();
    const outputDir = path.join(projectRoot, "dist");
    const env: NodeJS.ProcessEnv = {};

    await fs.promises.mkdir(outputDir, { recursive: true });

    await fs.promises.writeFile(
      path.join(outputDir, "appsscript.json"),
      JSON.stringify({ timeZone: "Asia/Tokyo" }),
      "utf8",
    );

    await fs.promises.writeFile(path.join(outputDir, "Code.js"), "function doGet() {}", "utf8");

    const credentialStore = createAppsScriptUserCredentialStore({
      platform: process.platform,
      homeDir,
      env,
    });

    await credentialStore.save("default", credential);

    const fetch = vi.fn(async () => new Response(null, { status: 200 }));

    await pushAppsScriptProject({
      projectRoot,
      outputDir,
      projectScriptId: "script/id",
      platform: process.platform,
      homeDir,
      env,
      fetch,
      now: () => now,
    });

    expect(fetch).toHaveBeenCalledOnce();

    expect(fetch).toHaveBeenCalledWith(
      "https://script.googleapis.com/v1/projects/script%2Fid/content",
      {
        method: "PUT",
        headers: {
          Authorization: "Bearer access-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          files: [
            {
              name: "Code",
              type: "SERVER_JS",
              source: "function doGet() {}",
            },
            {
              name: "appsscript",
              type: "JSON",
              source: JSON.stringify({ timeZone: "Asia/Tokyo" }),
            },
          ],
        }),
      },
    );
  });
});
