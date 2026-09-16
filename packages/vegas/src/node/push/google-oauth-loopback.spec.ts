import { describe, expect, test } from "vitest";

import { AppsScriptRemoteServiceError } from "./error";
import { startGoogleOAuthLoopbackListener } from "./google-oauth-loopback";

describe("startGoogleOAuthLoopbackListener", () => {
  test("listen on an ephemeral IPv4 loopback port", async () => {
    const listener = await startGoogleOAuthLoopbackListener("state-value");

    try {
      const redirectUri = new URL(listener.redirectUri);

      expect(redirectUri.protocol).toBe("http:");
      expect(redirectUri.hostname).toBe("127.0.0.1");
      expect(Number(redirectUri.port)).toBeGreaterThan(0);
    } finally {
      await listener.close();
    }
  });

  test("receive authorization code", async () => {
    const listener = await startGoogleOAuthLoopbackListener("state-value");

    try {
      const callback = expect(listener.waitForCallback()).resolves.toStrictEqual({
        code: "authorization-code",
      });
      const response = await fetch(
        `${listener.redirectUri}?code=authorization-code&state=state-value`,
      );

      expect(response.status).toBe(200);

      await callback;
    } finally {
      await listener.close();
    }
  });

  test("reject state mismatch", async () => {
    const listener = await startGoogleOAuthLoopbackListener("expected-state");

    try {
      const callback = expect(listener.waitForCallback()).rejects.toThrow(
        "Google OAuth state mismatch.",
      );

      const response = await fetch(
        `${listener.redirectUri}?code=authorization-code&state=unexpected-state`,
      );

      expect(response.status).toBe(400);

      await callback;
    } finally {
      await listener.close();
    }
  });

  test("reject OAuth authorization error", async () => {
    const listener = await startGoogleOAuthLoopbackListener("state-value");

    try {
      const callback = expect(listener.waitForCallback()).rejects.toThrow(
        "Google OAuth authorization failed: access_denied",
      );

      const response = await fetch(`${listener.redirectUri}?error=access_denied&state=state-value`);

      expect(response.status).toBe(200);

      await callback;
    } finally {
      await listener.close();
    }
  });

  test("ignore unrelated request", async () => {
    const listener = await startGoogleOAuthLoopbackListener("state-value");

    try {
      const response = await fetch(listener.redirectUri);

      expect(response.status).toBe(404);

      const callback = expect(listener.waitForCallback()).resolves.toStrictEqual({
        code: "authorization-code",
      });

      await fetch(`${listener.redirectUri}?code=authorization-code&state=state-value`);

      await callback;
    } finally {
      await listener.close();
    }
  });

  test("require state", async () => {
    await expect(startGoogleOAuthLoopbackListener("   ")).rejects.toThrow(
      "Google OAuth state is required.",
    );
  });

  test("reject OAuth authorization error", async () => {
    const listener = await startGoogleOAuthLoopbackListener("state-value");

    try {
      const callback = listener.waitForCallback();

      const response = await fetch(`${listener.redirectUri}?error=access_denied&state=state-value`);

      expect(response.status).toBe(200);

      let error: unknown;

      try {
        await callback;
      } catch (caught) {
        error = caught;
      }

      expect(error).toBeInstanceOf(AppsScriptRemoteServiceError);
      expect((error as Error).message).toBe("Google OAuth authorization failed: access_denied");
    } finally {
      await listener.close();
    }
  });
});
