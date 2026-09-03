import type { AccessTokenProvider, OAuthConfig } from "../core/types";

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface CachedAccessToken {
  value: string;
  expiresAt: number;
}

const ACCESS_TOKEN_EXPIRY_SKEW_MS = 60_000;

class RefreshTokenAccessTokenProvider implements AccessTokenProvider {
  readonly #config: OAuthConfig;
  #cachedAccessToken?: CachedAccessToken;
  #refreshPromise?: Promise<CachedAccessToken>;

  constructor(config: OAuthConfig) {
    this.#config = config;
  }

  async getAccessToken(): Promise<string> {
    const cached = this.#cachedAccessToken;
    if (cached && Date.now() < cached.expiresAt - ACCESS_TOKEN_EXPIRY_SKEW_MS) {
      return cached.value;
    }

    const refreshPromise = this.#refreshPromise ?? this.#refreshAccessToken();

    this.#refreshPromise = refreshPromise;

    try {
      const refreshed = await refreshPromise;
      this.#cachedAccessToken = refreshed;
      return refreshed.value;
    } finally {
      if (this.#refreshPromise === refreshPromise) {
        this.#refreshPromise = undefined;
      }
    }
  }

  async #refreshAccessToken(): Promise<CachedAccessToken> {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: this.#config.clientId,
        client_secret: this.#config.clientSecret,
        refresh_token: this.#config.refreshToken,
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

    const expiresIn =
      typeof body.expires_in === "number" && Number.isFinite(body.expires_in) && body.expires_in > 0
        ? body.expires_in
        : 0;

    return {
      value: body.access_token,
      expiresAt: Date.now() + expiresIn * 1000,
    };
  }
}

export function createAccessTokenProvider(config: OAuthConfig): AccessTokenProvider {
  return new RefreshTokenAccessTokenProvider(config);
}
