import type { AccessTokenProvider, OAuthConfig } from "../core/types";

interface TokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

class RefreshTokenAccessTokenProvider implements AccessTokenProvider {
  constructor(private readonly config: OAuthConfig) {}

  async getAccessToken(): Promise<string> {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: this.config.refreshToken,
        grant_type: "refresh_token",
      }),
    });
    let body: TokenResponse = {};
    const text = await response.text();
    if (text) {
      try {
        body = JSON.parse(text) as TokenResponse;
      } catch {
        // HTTP failure below will provide the useful fallback error.
      }
    }

    if (!response.ok) {
      throw new Error(
        body.error_description ?? body.error ?? `OAuth token request failed: ${response.status}`,
      );
    }

    if (!body.access_token) {
      throw new Error("OAuth token response did not contain access_token");
    }

    return body.access_token;
  }
}

export function createAccessTokenProvider(config: OAuthConfig): AccessTokenProvider {
  return new RefreshTokenAccessTokenProvider(config);
}
