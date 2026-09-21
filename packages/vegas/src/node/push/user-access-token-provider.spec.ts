import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test, vi } from "vitest";

import type { AppsScriptCredential } from "./credential";
import { createAppsScriptUserAccessTokenProvider } from "./user-access-token-provider";
import { createAppsScriptUserCredentialStore } from "./user-credential-store";

const now = 1_000_000;

const tempDirs: string[] = [];

async function createTempHome(): Promise<string> {
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "vegas-user-access-token-"));
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
  accessToken: "cached-access-token",
  expiryDate: now + 120_000,
  scopes: ["https://www.googleapis.com/auth/script.projects"],
};

describe("createAppsScriptUserAccessTokenProvider", () => {
  test("load usable access token from user credential store", async () => {
    const homeDir = await createTempHome();
    const env: NodeJS.ProcessEnv = {};

    const credentialStore = createAppsScriptUserCredentialStore({
      platform: process.platform,
      homeDir,
      env,
    });

    await credentialStore.save("work", credential);

    const fetch = vi.fn();

    const provider = createAppsScriptUserAccessTokenProvider({
      profile: "work",
      platform: process.platform,
      homeDir,
      env,
      fetch,
      now: () => now,
    });

    await expect(provider.getAccessToken()).resolves.toBe("cached-access-token");

    expect(fetch).not.toHaveBeenCalled();
  });

  test("refresh stale access token and persist it", async () => {
    const homeDir = await createTempHome();
    const env: NodeJS.ProcessEnv = {};

    const credentialStore = createAppsScriptUserCredentialStore({
      platform: process.platform,
      homeDir,
      env,
    });

    await credentialStore.save("default", {
      ...credential,
      expiryDate: now + 30_000,
    });

    let requestSignal: AbortSignal | undefined;
    const fetch = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      requestSignal = init?.signal ?? undefined;
      return new Response(
        JSON.stringify({
          access_token: "refreshed-access-token",
          expires_in: 3600,
        }),
        {
          status: 200,
        },
      );
    });
    const controller = new AbortController();

    const provider = createAppsScriptUserAccessTokenProvider({
      platform: process.platform,
      homeDir,
      env,
      fetch,
      now: () => now,
      signal: controller.signal,
      requestTimeoutMs: 30_000,
    });

    await expect(provider.getAccessToken()).resolves.toBe("refreshed-access-token");

    expect(fetch).toHaveBeenCalledOnce();
    expect(requestSignal).toBeInstanceOf(AbortSignal);

    controller.abort(new Error("refresh cancelled"));

    expect(requestSignal?.aborted).toBe(true);

    await expect(credentialStore.load("default")).resolves.toStrictEqual({
      clientId: "client-id",
      clientSecret: "client-secret",
      refreshToken: "refresh-token",
      accessToken: "refreshed-access-token",
      expiryDate: now + 3_600_000,
      scopes: ["https://www.googleapis.com/auth/script.projects"],
    });
  });
});
