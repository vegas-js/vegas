import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test, vi } from "vitest";

import { createAppsScriptUserCredentialStore } from "./user-credential-store";
import { loginGoogleAppsScriptUser } from "./user-login";

const now = 1_000_000;

const tempDirs: string[] = [];

async function createTempDir(): Promise<string> {
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "vegas-user-login-"));
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

describe("loginGoogleAppsScriptUser", () => {
  test("persist credentials in user credential store", async () => {
    const root = await createTempDir();
    const homeDir = await createTempDir();

    const clientFilePath = path.join(root, "client.json");

    await fs.promises.writeFile(
      clientFilePath,
      JSON.stringify({
        installed: {
          client_id: "client-id",
          client_secret: "client-secret",
        },
      }),
      "utf8",
    );

    const openAuthorizationUrl = vi.fn(async (authorizationUrl: string) => {
      const url = new URL(authorizationUrl);

      const redirectUri = url.searchParams.get("redirect_uri");
      const state = url.searchParams.get("state");

      if (redirectUri === null || state === null) {
        throw new Error("Invalid authorization URL in test.");
      }

      const response = await fetch(
        `${redirectUri}?code=authorization-code&state=${encodeURIComponent(state)}`,
      );

      expect(response.status).toBe(200);
    });

    let requestSignal: AbortSignal | undefined;
    const tokenFetch = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      requestSignal = init?.signal ?? undefined;
      return new Response(
        JSON.stringify({
          access_token: "access-token",
          refresh_token: "refresh-token",
          expires_in: 3600,
          scope: "https://www.googleapis.com/auth/script.projects",
        }),
        { status: 200 },
      );
    });
    const controller = new AbortController();

    await loginGoogleAppsScriptUser({
      clientFilePath,
      profile: "work",
      platform: process.platform,
      homeDir,
      env: {},
      openAuthorizationUrl,
      fetch: tokenFetch,
      now: () => now,
      signal: controller.signal,
      requestTimeoutMs: 30_000,
    });

    expect(openAuthorizationUrl).toHaveBeenCalledOnce();
    expect(tokenFetch).toHaveBeenCalledOnce();
    expect(requestSignal).toBeInstanceOf(AbortSignal);

    controller.abort(new Error("login cancelled"));

    expect(requestSignal?.aborted).toBe(true);

    const credentialStore = createAppsScriptUserCredentialStore({
      platform: process.platform,
      homeDir,
      env: {},
    });

    await expect(credentialStore.load("work")).resolves.toStrictEqual({
      clientId: "client-id",
      clientSecret: "client-secret",
      refreshToken: "refresh-token",
      accessToken: "access-token",
      expiryDate: now + 3_600_000,
      scopes: ["https://www.googleapis.com/auth/script.projects"],
    });
  });
});
