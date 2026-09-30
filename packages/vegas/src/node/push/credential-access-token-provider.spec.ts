import { describe, expect, test, vi } from "vitest";

import { AppsScriptAuthPrerequisiteError } from "../auth/error";
import type {
  AppsScriptAccessTokenRefresher,
  AppsScriptRefreshedAccessToken,
} from "./access-token";
import type { AppsScriptCredential } from "./credential";
import { createAppsScriptCredentialAccessTokenProvider } from "./credential-access-token-provider";
import type { AppsScriptCredentialStore } from "./credential-store";

const now = 1_000_000;

const credential: AppsScriptCredential = {
  clientId: "client-id",
  clientSecret: "client-secret",
  refreshToken: "refresh-token",
  accessToken: "cached-access-token",
  expiryDate: now + 120_000,
  scopes: ["https://www.googleapis.com/auth/script.projects"],
};

function createCredentialStore(loadedCredential: AppsScriptCredential | undefined) {
  const load = vi.fn(async () => loadedCredential);
  const save = vi.fn(async () => {});

  const store: AppsScriptCredentialStore = {
    load,
    save,
  };

  return {
    store,
    load,
    save,
  };
}

function createRefresher(
  refreshed: AppsScriptRefreshedAccessToken = {
    accessToken: "refreshed-access-token",
    expiryDate: now + 3_600_000,
  },
) {
  const refresh = vi.fn(async () => refreshed);

  const refresher: AppsScriptAccessTokenRefresher = {
    refresh,
  };

  return {
    refresher,
    refresh,
  };
}

describe("createAppsScriptCredentialAccessTokenProvider", () => {
  test("return usable cached access token", async () => {
    const credentialStore = createCredentialStore(credential);
    const refresher = createRefresher();

    const provider = createAppsScriptCredentialAccessTokenProvider({
      credentialStore: credentialStore.store,
      refresher: refresher.refresher,
      now: () => now,
    });

    await expect(provider.getAccessToken()).resolves.toBe("cached-access-token");

    expect(credentialStore.load).toHaveBeenCalledOnce();
    expect(credentialStore.load).toHaveBeenCalledWith("default");
    expect(refresher.refresh).not.toHaveBeenCalled();
    expect(credentialStore.save).not.toHaveBeenCalled();
  });

  test("reject missing credential", async () => {
    const credentialStore = createCredentialStore(undefined);
    const refresher = createRefresher();

    const provider = createAppsScriptCredentialAccessTokenProvider({
      credentialStore: credentialStore.store,
      refresher: refresher.refresher,
      now: () => now,
    });

    await expect(provider.getAccessToken()).rejects.toThrow(AppsScriptAuthPrerequisiteError);
    await expect(provider.getAccessToken()).rejects.toThrow(
      'Apps Script credentials not found for profile "default". Run "vegas auth login <oauth-client-json> --profile <profile>" with the same profile name to sign in.',
    );

    expect(refresher.refresh).not.toHaveBeenCalled();
    expect(credentialStore.save).not.toHaveBeenCalled();
  });

  test("reject credential missing a required OAuth scope before refresh", async () => {
    const staleCredential: AppsScriptCredential = {
      ...credential,
      expiryDate: now + 30_000,
    };
    const credentialStore = createCredentialStore(staleCredential);
    const refresher = createRefresher();

    const provider = createAppsScriptCredentialAccessTokenProvider({
      credentialStore: credentialStore.store,
      refresher: refresher.refresher,
      profile: "work",
      requiredScopes: [
        "https://www.googleapis.com/auth/script.projects",
        "https://www.googleapis.com/auth/spreadsheets",
      ],
      now: () => now,
    });

    await expect(provider.getAccessToken()).rejects.toThrow(AppsScriptAuthPrerequisiteError);
    await expect(provider.getAccessToken()).rejects.toThrow(
      'Apps Script credentials for profile "work" are missing required OAuth scopes: https://www.googleapis.com/auth/spreadsheets.',
    );

    expect(refresher.refresh).not.toHaveBeenCalled();
    expect(credentialStore.save).not.toHaveBeenCalled();
  });

  test("accept normalized duplicate required OAuth scopes", async () => {
    const credentialWithSpreadsheetScope: AppsScriptCredential = {
      ...credential,
      scopes: [
        "https://www.googleapis.com/auth/script.projects",
        "https://www.googleapis.com/auth/spreadsheets",
      ],
    };
    const credentialStore = createCredentialStore(credentialWithSpreadsheetScope);
    const refresher = createRefresher();

    const provider = createAppsScriptCredentialAccessTokenProvider({
      credentialStore: credentialStore.store,
      refresher: refresher.refresher,
      requiredScopes: [
        " https://www.googleapis.com/auth/spreadsheets ",
        "https://www.googleapis.com/auth/spreadsheets",
      ],
      now: () => now,
    });

    await expect(provider.getAccessToken()).resolves.toBe("cached-access-token");
    expect(refresher.refresh).not.toHaveBeenCalled();
  });

  test("reject empty required OAuth scope when creating provider", () => {
    const credentialStore = createCredentialStore(credential);
    const refresher = createRefresher();

    expect(() =>
      createAppsScriptCredentialAccessTokenProvider({
        credentialStore: credentialStore.store,
        refresher: refresher.refresher,
        requiredScopes: ["   "],
      }),
    ).toThrow("Apps Script required OAuth scope must not be empty.");
  });

  test("refresh stale access token and save credential", async () => {
    const staleCredential: AppsScriptCredential = {
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

    await expect(provider.getAccessToken()).resolves.toBe("refreshed-access-token");

    expect(refresher.refresh).toHaveBeenCalledOnce();
    expect(refresher.refresh).toHaveBeenCalledWith(staleCredential);

    expect(credentialStore.save).toHaveBeenCalledOnce();
    expect(credentialStore.save).toHaveBeenCalledWith("default", {
      clientId: "client-id",
      clientSecret: "client-secret",
      refreshToken: "refresh-token",
      accessToken: "refreshed-access-token",
      expiryDate: now + 3_600_000,
      scopes: ["https://www.googleapis.com/auth/script.projects"],
    });
  });

  test("reject refreshed access token when credential persistence fails", async () => {
    const staleCredential: AppsScriptCredential = {
      ...credential,
      expiryDate: now + 30_000,
    };
    const persistenceError = new Error("credential save failed");
    const load = vi.fn(async () => staleCredential);
    const save = vi.fn(async () => {
      throw persistenceError;
    });
    const refresher = createRefresher();
    const provider = createAppsScriptCredentialAccessTokenProvider({
      credentialStore: { load, save },
      refresher: refresher.refresher,
      now: () => now,
    });

    await expect(provider.getAccessToken()).rejects.toBe(persistenceError);

    expect(refresher.refresh).toHaveBeenCalledWith(staleCredential);
    expect(save).toHaveBeenCalledWith("default", {
      ...staleCredential,
      accessToken: "refreshed-access-token",
      expiryDate: now + 3_600_000,
    });
  });

  test("use selected auth profile", async () => {
    const credentialStore = createCredentialStore(credential);
    const refresher = createRefresher();

    const provider = createAppsScriptCredentialAccessTokenProvider({
      credentialStore: credentialStore.store,
      refresher: refresher.refresher,
      profile: "work",
      now: () => now,
    });

    await provider.getAccessToken();

    expect(credentialStore.load).toHaveBeenCalledWith("work");
  });

  test("reject invalid auth profile when creating provider", () => {
    const credentialStore = createCredentialStore(credential);
    const refresher = createRefresher();

    expect(() =>
      createAppsScriptCredentialAccessTokenProvider({
        credentialStore: credentialStore.store,
        refresher: refresher.refresher,
        profile: "   ",
      }),
    ).toThrow("Apps Script auth profile is required.");
  });
});
