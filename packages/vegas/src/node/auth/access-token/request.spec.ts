import { describe, expect, test, vi } from "vitest";

import { AppsScriptRemoteServiceError } from "../../infrastructure/google/apps-script-remote-service-error";
import type { AppsScriptCredential } from "../credential";
import type { AppsScriptCredentialStore } from "../credential/store";
import { createAppsScriptCredentialAccessTokenProvider } from "./credential-provider";
import { createGoogleAppsScriptAccessTokenRefresher } from "./google-refresher";
import {
  APPS_SCRIPT_ACCESS_TOKEN_EXPIRY_SKEW_MS,
  getUsableAppsScriptAccessToken,
  type AppsScriptAccessTokenRefresher,
  type AppsScriptRefreshedAccessToken,
} from "./index";

const now = 1_000_000;

const credential: AppsScriptCredential = {
  clientId: "client-id",
  clientSecret: "client-secret",
  refreshToken: "refresh-token",
  accessToken: "cached-access-token",
  expiryDate: now + 120_000,
  scopes: ["https://www.googleapis.com/auth/script.projects"],
};

function createCredentialStore(loadedCredential: AppsScriptCredential) {
  const load = vi.fn(async () => loadedCredential);
  const save = vi.fn(async () => undefined);
  const store: AppsScriptCredentialStore = { load, save };

  return { store, load, save };
}

function createRefresher(
  refreshed: AppsScriptRefreshedAccessToken = {
    accessToken: "refreshed-access-token",
    expiryDate: now + 3_600_000,
  },
) {
  const refresh = vi.fn(async () => refreshed);
  const refresher: AppsScriptAccessTokenRefresher = { refresh };

  return { refresher, refresh };
}

describe("Apps Script access token requests", () => {
  test("respect caller minimum validity while keeping the default safety window", () => {
    expect(getUsableAppsScriptAccessToken(credential, now)).toBe("cached-access-token");
    expect(getUsableAppsScriptAccessToken(credential, now, 360_000)).toBeUndefined();

    const boundaryCredential = {
      ...credential,
      expiryDate: now + APPS_SCRIPT_ACCESS_TOKEN_EXPIRY_SKEW_MS,
    };

    expect(getUsableAppsScriptAccessToken(boundaryCredential, now, 0)).toBeUndefined();
  });

  test("reject invalid minimum validity", () => {
    expect(() => getUsableAppsScriptAccessToken(credential, now, -1)).toThrow(
      "Apps Script access token minimum validity must be a non-negative integer.",
    );
    expect(() => getUsableAppsScriptAccessToken(credential, now, 1.5)).toThrow(RangeError);
  });

  test("refresh a cached token that cannot satisfy caller minimum validity", async () => {
    const credentialStore = createCredentialStore(credential);
    const refresher = createRefresher();
    const provider = createAppsScriptCredentialAccessTokenProvider({
      credentialStore: credentialStore.store,
      refresher: refresher.refresher,
      now: () => now,
    });

    await expect(provider.getAccessToken({ minimumValidityMs: 360_000 })).resolves.toBe(
      "refreshed-access-token",
    );

    expect(refresher.refresh).toHaveBeenCalledOnce();
    expect(credentialStore.save).toHaveBeenCalledWith("default", {
      ...credential,
      accessToken: "refreshed-access-token",
      expiryDate: now + 3_600_000,
    });
  });

  test("forward the caller signal to token refresh", async () => {
    const staleCredential = {
      ...credential,
      expiryDate: now + 30_000,
    };
    const credentialStore = createCredentialStore(staleCredential);
    const refresher = createRefresher();
    const provider = createAppsScriptCredentialAccessTokenProvider({
      credentialStore: credentialStore.store,
      refresher: refresher.refresher,
      now: () => now,
    });
    const controller = new AbortController();

    await provider.getAccessToken({ signal: controller.signal });

    expect(refresher.refresh).toHaveBeenCalledWith(staleCredential, {
      signal: controller.signal,
    });
  });

  test("reject an already aborted token request before reading credentials", async () => {
    const credentialStore = createCredentialStore(credential);
    const refresher = createRefresher();
    const provider = createAppsScriptCredentialAccessTokenProvider({
      credentialStore: credentialStore.store,
      refresher: refresher.refresher,
      now: () => now,
    });
    const controller = new AbortController();
    const reason = new Error("cancelled");

    controller.abort(reason);

    await expect(provider.getAccessToken({ signal: controller.signal })).rejects.toBe(reason);
    expect(credentialStore.load).not.toHaveBeenCalled();
    expect(refresher.refresh).not.toHaveBeenCalled();
  });

  test("reject a refreshed token that still cannot satisfy minimum validity", async () => {
    const credentialStore = createCredentialStore(credential);
    const refresher = createRefresher({
      accessToken: "short-lived-access-token",
      expiryDate: now + 300_000,
    });
    const provider = createAppsScriptCredentialAccessTokenProvider({
      credentialStore: credentialStore.store,
      refresher: refresher.refresher,
      now: () => now,
    });

    await expect(provider.getAccessToken({ minimumValidityMs: 360_000 })).rejects.toBeInstanceOf(
      AppsScriptRemoteServiceError,
    );
    expect(credentialStore.save).not.toHaveBeenCalled();
  });

  test("combine configured and per-request signals for Google token refresh", async () => {
    let refreshSignal: AbortSignal | undefined;
    const fetch = vi.fn<typeof globalThis.fetch>(async (_input, init) => {
      refreshSignal = init?.signal ?? undefined;

      return new Response(
        JSON.stringify({
          access_token: "new-access-token",
          expires_in: 3600,
        }),
        { status: 200 },
      );
    });
    const configuredController = new AbortController();
    const requestController = new AbortController();
    const refresher = createGoogleAppsScriptAccessTokenRefresher({
      fetch,
      now: () => now,
      signal: configuredController.signal,
    });

    await refresher.refresh(credential, { signal: requestController.signal });

    expect(refreshSignal).toBeInstanceOf(AbortSignal);
    expect(refreshSignal?.aborted).toBe(false);

    requestController.abort(new Error("request cancelled"));

    expect(refreshSignal?.aborted).toBe(true);
  });
});
