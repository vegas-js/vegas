import { describe, expect, test, vi } from "vitest";

import type { AppsScriptCredential } from "./credential";
import { createGoogleAppsScriptAccessTokenRefresher } from "./google-access-token-refresher";

const now = 1_000_000;

const credential: AppsScriptCredential = {
  clientId: "client/id+value",
  clientSecret: "client&secret",
  refreshToken: "refresh=token",
  scopes: ["https://www.googleapis.com/auth/script.projects"],
};

describe("createGoogleAppsScriptAccessTokenRefresher", () => {
  test("refresh access token with Google OAuth token endpoint", async () => {
    const fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            access_token: "new-access-token",
            expires_in: 3600,
            token_type: "Bearer",
            scope: "https://www.googleapis.com/auth/script.projects",
          }),
          {
            status: 200,
          },
        ),
    );

    const refresher = createGoogleAppsScriptAccessTokenRefresher({
      fetch,
      now: () => now,
    });

    await expect(refresher.refresh(credential)).resolves.toStrictEqual({
      accessToken: "new-access-token",
      expiryDate: now + 3_600_000,
    });

    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: "client/id+value",
        client_secret: "client&secret",
        refresh_token: "refresh=token",
        grant_type: "refresh_token",
      }).toString(),
    });
  });

  test("reject failed token response with response body", async () => {
    const fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            error: "invalid_grant",
            error_description: "Token has been revoked.",
          }),
          {
            status: 400,
            statusText: "Bad Request",
          },
        ),
    );

    const refresher = createGoogleAppsScriptAccessTokenRefresher({
      fetch,
      now: () => now,
    });

    let error: unknown;

    try {
      await refresher.refresh(credential);
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain(
      "Google OAuth token refresh failed: 400 Bad Request",
    );
    expect((error as Error).message).toContain("invalid_grant");

    expect(fetch).toHaveBeenCalledOnce();
  });

  test("reject failed token response without response body", async () => {
    const fetch = vi.fn(
      async () =>
        new Response(null, {
          status: 500,
          statusText: "Internal Server Error",
        }),
    );

    const refresher = createGoogleAppsScriptAccessTokenRefresher({
      fetch,
    });

    await expect(refresher.refresh(credential)).rejects.toThrow(
      "Google OAuth token refresh failed: 500 Internal Server Error",
    );
  });

  test("reject malformed successful token response", async () => {
    const fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            access_token: "new-access-token",
          }),
          {
            status: 200,
          },
        ),
    );

    const refresher = createGoogleAppsScriptAccessTokenRefresher({
      fetch,
    });

    await expect(refresher.refresh(credential)).rejects.toThrow(
      "Invalid Google OAuth token response.",
    );
  });

  test("reject invalid token lifetime", async () => {
    const fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            access_token: "new-access-token",
            expires_in: 0,
          }),
          {
            status: 200,
          },
        ),
    );

    const refresher = createGoogleAppsScriptAccessTokenRefresher({
      fetch,
    });

    await expect(refresher.refresh(credential)).rejects.toThrow(
      "Invalid Google OAuth token response.",
    );
  });
});
