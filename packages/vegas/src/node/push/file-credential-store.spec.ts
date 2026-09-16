import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { createAppsScriptFileCredentialStore } from "./file-credential-store";

const tempDirs: string[] = [];

async function createTempCredentialPath(): Promise<string> {
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "vegas-credential-"));
  tempDirs.push(tempDir);

  return path.join(tempDir, "vegas", "credentials.json");
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

describe("createAppsScriptFileCredentialStore", () => {
  test("return undefined when credential file does not exist", async () => {
    const filePath = await createTempCredentialPath();
    const store = createAppsScriptFileCredentialStore(filePath);

    await expect(store.load("default")).resolves.toBeUndefined();
  });

  test("save and load credential", async () => {
    const filePath = await createTempCredentialPath();
    const store = createAppsScriptFileCredentialStore(filePath);

    await store.save("default", credential);

    await expect(store.load("default")).resolves.toStrictEqual(credential);
  });

  test("preserve other profiles when saving credential", async () => {
    const filePath = await createTempCredentialPath();
    const store = createAppsScriptFileCredentialStore(filePath);

    await store.save("default", credential);

    const workCredential = {
      ...credential,
      refreshToken: "work-refresh-token",
    };

    await store.save("work", workCredential);

    await expect(store.load("default")).resolves.toStrictEqual(credential);
    await expect(store.load("work")).resolves.toStrictEqual(workCredential);
  });

  test("write versioned credential file", async () => {
    const filePath = await createTempCredentialPath();
    const store = createAppsScriptFileCredentialStore(filePath);

    await store.save("default", credential);

    expect(JSON.parse(await fs.promises.readFile(filePath, "utf8"))).toStrictEqual({
      version: 1,
      profiles: {
        default: credential,
      },
    });
  });

  test("reject symbolic link credential file", async () => {
    if (process.platform === "win32") {
      return;
    }

    const filePath = await createTempCredentialPath();

    await fs.promises.mkdir(path.dirname(filePath), {
      recursive: true,
    });

    const targetPath = path.join(path.dirname(filePath), "target.json");

    await fs.promises.writeFile(targetPath, "{}");
    await fs.promises.symlink(targetPath, filePath);

    const store = createAppsScriptFileCredentialStore(filePath);

    await expect(store.load("default")).rejects.toThrow(
      `Apps Script credential file must not be a symbolic link: ${filePath}`,
    );
    await expect(store.save("default", credential)).rejects.toThrow(
      `Apps Script credential file must not be a symbolic link: ${filePath}`,
    );
  });

  test("write restrictive POSIX permissions", async () => {
    if (process.platform === "win32") {
      return;
    }

    const filePath = await createTempCredentialPath();
    const store = createAppsScriptFileCredentialStore(filePath);

    await store.save("default", credential);

    const directoryStat = await fs.promises.stat(path.dirname(filePath));
    const fileStat = await fs.promises.stat(filePath);

    expect(directoryStat.mode & 0o777).toBe(0o700);
    expect(fileStat.mode & 0o777).toBe(0o600);
  });

  test("return undefined for inherited profile name", async () => {
    const filePath = await createTempCredentialPath();
    const store = createAppsScriptFileCredentialStore(filePath);

    await store.save("default", credential);

    await expect(store.load("toString")).resolves.toBeUndefined();
  });
});
