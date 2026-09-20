import { describe, expect, test } from "vitest";

import {
  parseGoogleOAuthAccessToken,
  parseGoogleOAuthTokenResponse,
} from "./google-oauth-token-response";

describe("Google OAuth token response", () => {
  test("parse common access token fields", () => {
    const response = parseGoogleOAuthTokenResponse(
      JSON.stringify({
        access_token: "access-token",
        expires_in: 3600,
        refresh_token: "refresh-token",
      }),
    );

    expect(parseGoogleOAuthAccessToken(response, 1_000_000)).toStrictEqual({
      accessToken: "access-token",
      expiryDate: 4_600_000,
    });
    expect(response.refresh_token).toBe("refresh-token");
  });

  test.each(["not json", "null", "[]"])("reject invalid token response object: %s", (content) => {
    expect(() => parseGoogleOAuthTokenResponse(content)).toThrow(
      "Invalid Google OAuth token response.",
    );
  });

  test.each([
    { access_token: "", expires_in: 3600 },
    { access_token: "access-token", expires_in: 0 },
  ])("reject invalid common access token fields", (response) => {
    expect(() => parseGoogleOAuthAccessToken(response, 1_000_000)).toThrow(
      "Invalid Google OAuth token response.",
    );
  });
});
