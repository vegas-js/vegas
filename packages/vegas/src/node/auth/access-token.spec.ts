import { describe, expect, test } from "vitest";

import {
  APPS_SCRIPT_ACCESS_TOKEN_EXPIRY_SKEW_MS,
  getUsableAppsScriptAccessToken,
} from "./access-token";
import type { AppsScriptCredential } from "./credential";

const now = 1_000_000;

function createCredential(overrides: Partial<AppsScriptCredential> = {}): AppsScriptCredential {
  return {
    clientId: "client-id",
    clientSecret: "client-secret",
    refreshToken: "refresh-token",
    accessToken: "access-token",
    expiryDate: now + APPS_SCRIPT_ACCESS_TOKEN_EXPIRY_SKEW_MS + 1,
    scopes: ["https://www.googleapis.com/auth/script.projects"],
    ...overrides,
  };
}

describe("getUsableAppsScriptAccessToken", () => {
  test("return cached access token with sufficient lifetime", () => {
    expect(getUsableAppsScriptAccessToken(createCredential(), now)).toBe("access-token");
  });

  test("require cached access token", () => {
    expect(
      getUsableAppsScriptAccessToken(createCredential({ accessToken: undefined }), now),
    ).toBeUndefined();
  });

  test("require access token expiry date", () => {
    expect(
      getUsableAppsScriptAccessToken(createCredential({ expiryDate: undefined }), now),
    ).toBeUndefined();
  });

  test("reject access token at expiry safety boundary", () => {
    expect(
      getUsableAppsScriptAccessToken(
        createCredential({ expiryDate: now + APPS_SCRIPT_ACCESS_TOKEN_EXPIRY_SKEW_MS }),
        now,
      ),
    ).toBeUndefined();
  });

  test("reject access token inside expiry safety window", () => {
    expect(
      getUsableAppsScriptAccessToken(
        createCredential({ expiryDate: now + APPS_SCRIPT_ACCESS_TOKEN_EXPIRY_SKEW_MS - 1 }),
        now,
      ),
    ).toBeUndefined();
  });

  test("reject expired access token", () => {
    expect(
      getUsableAppsScriptAccessToken(createCredential({ expiryDate: now - 1 }), now),
    ).toBeUndefined();
  });
});
