import { describe, expect, test } from "vitest";

import { AppsScriptAuthPrerequisiteError } from "./error";
import { parseGoogleOAuthDesktopClient } from "./google-oauth-client";

describe("parseGoogleOAuthDesktopClient", () => {
  test("parse installed OAuth client", () => {
    expect(
      parseGoogleOAuthDesktopClient(
        JSON.stringify({
          installed: {
            client_id: "client.apps.googleusercontent.com",
            client_secret: "client-secret",
            project_id: "project-id",
            auth_uri: "https://accounts.google.com/o/oauth2/auth",
            token_uri: "https://oauth2.googleapis.com/token",
            redirect_uris: ["http://localhost"],
          },
        }),
      ),
    ).toStrictEqual({
      clientId: "client.apps.googleusercontent.com",
      clientSecret: "client-secret",
    });
  });

  test("reject malformed JSON", () => {
    expect(() => parseGoogleOAuthDesktopClient("{")).toThrow(
      "Invalid Google OAuth desktop client file. Use a Desktop app OAuth client JSON.",
    );
  });

  test("require client ID", () => {
    expect(() =>
      parseGoogleOAuthDesktopClient(
        JSON.stringify({
          installed: {
            client_id: "   ",
            client_secret: "client-secret",
          },
        }),
      ),
    ).toThrow("Invalid Google OAuth desktop client file. Use a Desktop app OAuth client JSON.");
  });

  test("require client secret", () => {
    expect(() =>
      parseGoogleOAuthDesktopClient(
        JSON.stringify({
          installed: {
            client_id: "client-id",
          },
        }),
      ),
    ).toThrow("Invalid Google OAuth desktop client file. Use a Desktop app OAuth client JSON.");
  });

  test("reject web OAuth client", () => {
    const parse = () =>
      parseGoogleOAuthDesktopClient(
        JSON.stringify({
          web: {
            client_id: "client-id",
            client_secret: "client-secret",
          },
        }),
      );

    expect(parse).toThrow(AppsScriptAuthPrerequisiteError);
    expect(parse).toThrow(
      "Invalid Google OAuth desktop client file. Use a Desktop app OAuth client JSON.",
    );
  });
});
