import { describe, expect, test } from "vitest";

import {
  APPS_SCRIPT_PROJECTS_OAUTH_SCOPE,
  createGoogleOAuthAuthorizationUrl,
  createGoogleOAuthCodeChallenge,
} from "./authorization";

describe("createGoogleOAuthCodeChallenge", () => {
  test("create S256 code challenge", () => {
    expect(createGoogleOAuthCodeChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe(
      "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
    );
  });

  test("reject code verifier shorter than 43 characters", () => {
    expect(() => createGoogleOAuthCodeChallenge("a".repeat(42))).toThrow(
      "Invalid Google OAuth code verifier.",
    );
  });

  test("reject code verifier longer than 128 characters", () => {
    expect(() => createGoogleOAuthCodeChallenge("a".repeat(129))).toThrow(
      "Invalid Google OAuth code verifier.",
    );
  });

  test("reject invalid code verifier characters", () => {
    expect(() => createGoogleOAuthCodeChallenge(`${"a".repeat(42)}+`)).toThrow(
      "Invalid Google OAuth code verifier.",
    );
  });

  describe("createGoogleOAuthAuthorizationUrl", () => {
    test("create installed app authorization URL", () => {
      const authorizationUrl = createGoogleOAuthAuthorizationUrl({
        clientId: "client.apps.googleusercontent.com",
        redirectUri: "http://127.0.0.1:45678",
        state: "state-value",
        codeChallenge: "code-challenge",
      });

      const url = new URL(authorizationUrl);

      expect(`${url.origin}${url.pathname}`).toBe("https://accounts.google.com/o/oauth2/v2/auth");
      expect(Object.fromEntries(url.searchParams.entries())).toStrictEqual({
        client_id: "client.apps.googleusercontent.com",
        redirect_uri: "http://127.0.0.1:45678",
        response_type: "code",
        scope: "https://www.googleapis.com/auth/script.projects",
        access_type: "offline",
        prompt: "consent",
        state: "state-value",
        code_challenge: "code-challenge",
        code_challenge_method: "S256",
      });
    });

    test("include additional scopes without duplicating Apps Script projects scope", () => {
      const authorizationUrl = createGoogleOAuthAuthorizationUrl({
        clientId: "client-id",
        redirectUri: "http://127.0.0.1:45678",
        state: "state-value",
        codeChallenge: "code-challenge",
        scopes: ["https://www.googleapis.com/auth/spreadsheets", APPS_SCRIPT_PROJECTS_OAUTH_SCOPE],
      });

      const url = new URL(authorizationUrl);

      expect(url.searchParams.get("scope")).toBe(
        "https://www.googleapis.com/auth/script.projects https://www.googleapis.com/auth/spreadsheets",
      );
    });

    test("reject empty additional scope", () => {
      expect(() =>
        createGoogleOAuthAuthorizationUrl({
          clientId: "client-id",
          redirectUri: "http://127.0.0.1:45678",
          state: "state-value",
          codeChallenge: "code-challenge",
          scopes: ["   "],
        }),
      ).toThrow("Google OAuth scope must not be empty.");
    });

    test("use Apps Script projects scope", () => {
      expect(APPS_SCRIPT_PROJECTS_OAUTH_SCOPE).toBe(
        "https://www.googleapis.com/auth/script.projects",
      );
    });

    test("require state", () => {
      expect(() =>
        createGoogleOAuthAuthorizationUrl({
          clientId: "client-id",
          redirectUri: "http://127.0.0.1:45678",
          state: "   ",
          codeChallenge: "code-challenge",
        }),
      ).toThrow("Google OAuth state is required.");
    });
  });
});
