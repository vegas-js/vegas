import { describe, expect, test, vi } from "vitest";

import { AppsScriptRemoteServiceError } from "./error";
import { APPS_SCRIPT_PROJECTS_OAUTH_SCOPE } from "./google-oauth-authorization";
import { exchangeGoogleOAuthAuthorizationCode } from "./google-oauth-token-exchange";

const now = 1_000_000;

const client = {
  clientId: "client/id+value",
  clientSecret: "client&secret",
};

describe("exchangeGoogleOAuthAuthorizationCode", () => {
  test("exchange authorization code for tokens", async () => {
    const fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            access_token: "access-token",
            expires_in: 3600,
            refresh_token: "refresh-token",
            scope: APPS_SCRIPT_PROJECTS_OAUTH_SCOPE,
            token_type: "Bearer",
          }),
          { status: 200 },
        ),
    );

    await expect(
      exchangeGoogleOAuthAuthorizationCode({
        client,
        code: "authorization=code",
        codeVerifier: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
        redirectUri: "http://127.0.0.1:45678",
        fetch,
        now: () => now,
      }),
    ).resolves.toStrictEqual({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiryDate: now + 3_600_000,
      scopes: [APPS_SCRIPT_PROJECTS_OAUTH_SCOPE],
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
        code: "authorization=code",
        code_verifier: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
        grant_type: "authorization_code",
        redirect_uri: "http://127.0.0.1:45678",
      }).toString(),
    });
  });

  test("preserve granted scopes", async () => {
    const fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            access_token: "access-token",
            expires_in: 3600,
            refresh_token: "refresh-token",
            scope: `${APPS_SCRIPT_PROJECTS_OAUTH_SCOPE} another-scope`,
          }),
          { status: 200 },
        ),
    );

    await expect(
      exchangeGoogleOAuthAuthorizationCode({
        client,
        code: "authorization-code",
        codeVerifier: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
        redirectUri: "http://127.0.0.1:45678",
        fetch,
        now: () => now,
      }),
    ).resolves.toMatchObject({
      scopes: [APPS_SCRIPT_PROJECTS_OAUTH_SCOPE, "another-scope"],
    });
  });

  test("reject response without required Apps Script scope", async () => {
    const fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            access_token: "access-token",
            expires_in: 3600,
            refresh_token: "refresh-token",
            scope: "another-scope",
          }),
          { status: 200 },
        ),
    );

    await expect(
      exchangeGoogleOAuthAuthorizationCode({
        client,
        code: "authorization-code",
        codeVerifier: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
        redirectUri: "http://127.0.0.1:45678",
        fetch,
        now: () => now,
      }),
    ).rejects.toThrow("Google OAuth response did not grant the required Apps Script scope.");
  });

  test("reject malformed successful response", async () => {
    const fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            access_token: "access-token",
            expires_in: 3600,
          }),
          {
            status: 200,
          },
        ),
    );

    await expect(
      exchangeGoogleOAuthAuthorizationCode({
        client,
        code: "authorization-code",
        codeVerifier: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
        redirectUri: "http://127.0.0.1:45678",
        fetch,
        now: () => now,
      }),
    ).rejects.toThrow("Invalid Google OAuth token response.");
  });

  test("reject failed token exchange with response body", async () => {
    const fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            error: "invalid_grant",
            error_description: "Bad Request",
          }),
          {
            status: 400,
            statusText: "Bad Request",
          },
        ),
    );

    const exchange = exchangeGoogleOAuthAuthorizationCode({
      client,
      code: "authorization-code",
      codeVerifier: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
      redirectUri: "http://127.0.0.1:45678",
      fetch,
      now: () => now,
    });

    await expect(exchange).rejects.toThrow(AppsScriptRemoteServiceError);
    await expect(exchange).rejects.toThrow(
      "Google OAuth authorization code exchange failed: 400 Bad Request (invalid_grant: Bad Request)",
    );

    expect(fetch).toHaveBeenCalledOnce();
  });
});
