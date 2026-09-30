import { describe, expect, test, vi } from "vitest";

import {
  createGoogleOAuthAuthorizationUrlOpener,
  createGoogleOAuthBrowserCommand,
} from "./google-oauth-browser";

const authorizationUrl =
  "https://accounts.google.com/o/oauth2/v2/auth?client_id=client&state=value";

describe("createGoogleOAuthBrowserCommand", () => {
  test("create Windows browser command", () => {
    expect(createGoogleOAuthBrowserCommand("win32", authorizationUrl)).toStrictEqual({
      command: "rundll32.exe",
      args: ["url.dll,FileProtocolHandler", authorizationUrl],
    });
  });

  test("create macOS browser command", () => {
    expect(createGoogleOAuthBrowserCommand("darwin", authorizationUrl)).toStrictEqual({
      command: "open",
      args: [authorizationUrl],
    });
  });

  test("create Linux browser command", () => {
    expect(createGoogleOAuthBrowserCommand("linux", authorizationUrl)).toStrictEqual({
      command: "xdg-open",
      args: [authorizationUrl],
    });
  });

  test("reject unsupported platform", () => {
    expect(() => createGoogleOAuthBrowserCommand("freebsd", authorizationUrl)).toThrow(
      "Unsupported platform for Google OAuth browser authorization: freebsd",
    );
  });

  test("require authorization URL", () => {
    expect(() => createGoogleOAuthBrowserCommand("linux", "   ")).toThrow(
      "Google OAuth authorization URL is required.",
    );
  });
});

describe("createGoogleOAuthAuthorizationUrlOpener", () => {
  test("launch platform browser command", async () => {
    const launch = vi.fn(async (_command: string, _args: readonly string[]) => {});

    const openAuthorizationUrl = createGoogleOAuthAuthorizationUrlOpener({
      platform: "linux",
      launch,
    });

    await openAuthorizationUrl(authorizationUrl);

    expect(launch).toHaveBeenCalledOnce();
    expect(launch).toHaveBeenCalledWith("xdg-open", [authorizationUrl]);
  });

  test("propagate browser launch failure", async () => {
    const launch = vi.fn(async () => {
      throw new Error("browser unavailable");
    });

    const openAuthorizationUrl = createGoogleOAuthAuthorizationUrlOpener({
      platform: "linux",
      launch,
    });

    await expect(openAuthorizationUrl(authorizationUrl)).rejects.toThrow("browser unavailable");
  });
});
