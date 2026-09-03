import { afterEach, expect, test, vi } from "vitest";

import type { OAuthConfig } from "../core/types";
import { createAccessTokenProvider } from "./oauth";

afterEach(() => vi.unstubAllGlobals());

test("return an access_token in a successful response", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        access_token: "access-token",
        expires_in: 3600,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    ),
  );
  vi.stubGlobal("fetch", fetchMock);
  const oauthConfig: OAuthConfig = {
    clientId: "client-id",
    clientSecret: "client-secret",
    refreshToken: "refresh_token",
  };
  const accessTokenProvider = createAccessTokenProvider(oauthConfig);
  const result = await accessTokenProvider.getAccessToken();
  const [, init] = fetchMock.mock.calls[0];
  const params = new URLSearchParams(init.body as string);

  expect(result).toBe("access-token");
  expect(params.get("client_id")).toBe("client-id");
  expect(params.get("client_secret")).toBe("client-secret");
  expect(params.get("refresh_token")).toBe("refresh_token");
  expect(params.get("grant_type")).toBe("refresh_token");
});

test("throw an HTTP error or OAuth error", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(undefined, {
      status: 404,
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  const oauthConfig: OAuthConfig = {
    clientId: "",
    clientSecret: "",
    refreshToken: "",
  };
  const accessTokenProvider = createAccessTokenProvider(oauthConfig);
  await expect(accessTokenProvider.getAccessToken()).rejects.toThrow(
    "OAuth token request failed: 404",
  );
});

test("throw an OAuth error", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        error: "invalid_grant",
        error_description: "Bad Request",
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      },
    ),
  );
  vi.stubGlobal("fetch", fetchMock);
  const oauthConfig: OAuthConfig = {
    clientId: "",
    clientSecret: "",
    refreshToken: "",
  };
  const accessTokenProvider = createAccessTokenProvider(oauthConfig);
  await expect(accessTokenProvider.getAccessToken()).rejects.toThrow("Bad Request");
});

test("throw an exception when there is no access_token despite an HTTP 200 response", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({}), {
      status: 200,
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  const oauthConfig: OAuthConfig = {
    clientId: "",
    clientSecret: "",
    refreshToken: "",
  };
  const accessTokenProvider = createAccessTokenProvider(oauthConfig);
  await expect(accessTokenProvider.getAccessToken()).rejects.toThrow(
    "OAuth token response did not contain access_token",
  );
});

test("reuse a cached access token", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        access_token: "access-token",
        expires_in: 3600,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    ),
  );
  vi.stubGlobal("fetch", fetchMock);

  const accessTokenProvider = createAccessTokenProvider({
    clientId: "client-id",
    clientSecret: "client-secret",
    refreshToken: "refresh-token",
  });

  await expect(accessTokenProvider.getAccessToken()).resolves.toBe("access-token");
  await expect(accessTokenProvider.getAccessToken()).resolves.toBe("access-token");

  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("share an access token refresh between concurrent callers", async () => {
  let resolveResponse!: (response: Response) => void;

  const responsePromise = new Promise<Response>((resolve) => {
    resolveResponse = resolve;
  });

  const fetchMock = vi.fn().mockReturnValue(responsePromise);
  vi.stubGlobal("fetch", fetchMock);

  const accessTokenProvider = createAccessTokenProvider({
    clientId: "client-id",
    clientSecret: "client-secret",
    refreshToken: "refresh-token",
  });

  const first = accessTokenProvider.getAccessToken();
  const second = accessTokenProvider.getAccessToken();

  resolveResponse(
    new Response(
      JSON.stringify({
        access_token: "access-token",
        expires_in: 3600,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    ),
  );

  await expect(Promise.all([first, second])).resolves.toEqual(["access-token", "access-token"]);

  expect(fetchMock).toHaveBeenCalledTimes(1);
});
