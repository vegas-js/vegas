import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test, vi } from "vitest";

import { createAppsScriptFileCredentialStore } from "./file-credential-store";
import { createGoogleOAuthCodeChallenge } from "./google-oauth-authorization";
import { loginGoogleAppsScript } from "./google-oauth-login";

const now = 1_000_000;

const tempDirs: string[] = [];

async function createTempDir(): Promise<string> {
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "vegas-oauth-login-"));
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

describe("loginGoogleAppsScript", () => {
  test("authorize and persist Apps Script credentials", async () => {
    const root = await createTempDir();

    const clientFilePath = path.join(root, "client.json");

    await fs.promises.writeFile(
      clientFilePath,
      JSON.stringify({
        installed: {
          client_id: "client.apps.googleusercontent.com",
          client_secret: "client-secret",
        },
      }),
      "utf8",
    );

    const credentialStore = createAppsScriptFileCredentialStore(
      path.join(root, "credentials.json"),
    );

    let openedAuthorizationUrl: string | undefined;

    const openAuthorizationUrl = vi.fn(async (authorizationUrl: string) => {
      openedAuthorizationUrl = authorizationUrl;

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

    let tokenRequestBody: string | undefined;

    const tokenFetch = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      tokenRequestBody = String(init?.body);

      return new Response(
        JSON.stringify({
          access_token: "access-token",
          refresh_token: "refresh-token",
          expires_in: 3600,
          scope: "https://www.googleapis.com/auth/script.projects",
          token_type: "Bearer",
        }),
        {
          status: 200,
        },
      );
    });

    await loginGoogleAppsScript({
      clientFilePath,
      credentialStore,
      openAuthorizationUrl,
      fetch: tokenFetch,
      now: () => now,
    });

    expect(openAuthorizationUrl).toHaveBeenCalledOnce();
    expect(tokenFetch).toHaveBeenCalledOnce();

    expect(openedAuthorizationUrl).toBeDefined();
    expect(tokenRequestBody).toBeDefined();

    const authorizationUrl = new URL(openedAuthorizationUrl!);

    const tokenBody = new URLSearchParams(tokenRequestBody);

    const codeVerifier = tokenBody.get("code_verifier");

    expect(codeVerifier).not.toBeNull();

    expect(createGoogleOAuthCodeChallenge(codeVerifier!)).toBe(
      authorizationUrl.searchParams.get("code_challenge"),
    );

    expect(tokenBody.get("redirect_uri")).toBe(authorizationUrl.searchParams.get("redirect_uri"));

    expect(await credentialStore.load("default")).toStrictEqual({
      clientId: "client.apps.googleusercontent.com",
      clientSecret: "client-secret",
      refreshToken: "refresh-token",
      accessToken: "access-token",
      expiryDate: now + 3_600_000,
      scopes: ["https://www.googleapis.com/auth/script.projects"],
    });
  });

  test("do not persist credentials when authorization fails", async () => {
    const root = await createTempDir();

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

    const credentialStore = createAppsScriptFileCredentialStore(
      path.join(root, "credentials.json"),
    );

    const openAuthorizationUrl = vi.fn(async (authorizationUrl: string) => {
      const url = new URL(authorizationUrl);

      const redirectUri = url.searchParams.get("redirect_uri");
      const state = url.searchParams.get("state");

      if (redirectUri === null || state === null) {
        throw new Error("Invalid authorization URL in test.");
      }

      await fetch(`${redirectUri}?error=access_denied&state=${encodeURIComponent(state)}`);
    });

    const tokenFetch = vi.fn();

    await expect(
      loginGoogleAppsScript({
        clientFilePath,
        credentialStore,
        openAuthorizationUrl,
        fetch: tokenFetch,
        now: () => now,
      }),
    ).rejects.toThrow("Google OAuth authorization failed: access_denied");

    expect(tokenFetch).not.toHaveBeenCalled();

    await expect(credentialStore.load("default")).resolves.toBeUndefined();
  });
});
