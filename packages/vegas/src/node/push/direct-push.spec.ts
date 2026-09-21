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
    const env: NodeJS.ProcessEnv = { VEGAS_SCRIPT_ID: "environment/id" };

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

    let requestSignal: AbortSignal | undefined;
    const fetch = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      requestSignal = init?.signal ?? undefined;
      return new Response(null, { status: 200 });
    });
    const controller = new AbortController();

    await pushAppsScriptProject({
      projectRoot,
      outputDir,
      projectScriptId: "project/id",
      platform: process.platform,
      homeDir,
      env,
      fetch,
      now: () => now,
      signal: controller.signal,
      requestTimeoutMs: 30_000,
    });

    expect(fetch).toHaveBeenCalledOnce();
    expect(requestSignal).toBeInstanceOf(AbortSignal);

    controller.abort(new Error("push cancelled"));

    expect(requestSignal?.aborted).toBe(true);

    expect(fetch).toHaveBeenCalledWith(
      "https://script.googleapis.com/v1/projects/environment%2Fid/content",
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
        signal: expect.any(AbortSignal),
      },
    );
  });
});
