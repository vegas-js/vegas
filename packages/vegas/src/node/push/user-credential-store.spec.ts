import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { resolveAppsScriptCredentialPath } from "./credential-path";
import { createAppsScriptUserCredentialStore } from "./user-credential-store";

const tempDirs: string[] = [];

async function createTempHome(): Promise<string> {
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "vegas-user-credential-"));
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

const credential = {
  clientId: "client-id",
  clientSecret: "client-secret",
  refreshToken: "refresh-token",
  scopes: ["https://www.googleapis.com/auth/script.projects"],
};

describe("createAppsScriptUserCredentialStore", () => {
  test("use OS user credential path", async () => {
    const homeDir = await createTempHome();
    const env: NodeJS.ProcessEnv = {};

    const store = createAppsScriptUserCredentialStore({
      platform: process.platform,
      homeDir,
      env,
    });

    await store.save("default", credential);

    const filePath = resolveAppsScriptCredentialPath({
      platform: process.platform,
      homeDir,
    });

    await expect(fs.promises.readFile(filePath, "utf8")).resolves.toBeTruthy();
    await expect(store.load("default")).resolves.toStrictEqual(credential);
  });

  test("use XDG_CONFIG_HOME on Linux", async () => {
    if (process.platform !== "linux") {
      return;
    }

    const homeDir = await createTempHome();
    const configDir = path.join(homeDir, "custom-config");

    const store = createAppsScriptUserCredentialStore({
      platform: "linux",
      homeDir,
      env: {
        XDG_CONFIG_HOME: configDir,
      },
    });

    await store.save("default", credential);

    await expect(
      fs.promises.readFile(path.join(configDir, "vegas", "credentials.json"), "utf8"),
    ).resolves.toBeTruthy();
  });
});
