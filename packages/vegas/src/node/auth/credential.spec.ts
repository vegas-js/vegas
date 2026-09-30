import { describe, expect, test } from "vitest";

import { createAppsScriptCredentialFile, parseAppsScriptCredentialFile } from "./credential";

describe("Apps Script credential file", () => {
  test("create version 1 credential file", () => {
    const credential = {
      clientId: "client-id",
      clientSecret: "client-secret",
      refreshToken: "refresh-token",
      accessToken: "access-token",
      expiryDate: 123456789,
      scopes: ["https://www.googleapis.com/auth/script.projects"],
    };

    expect(createAppsScriptCredentialFile({ default: credential })).toStrictEqual({
      version: 1,
      profiles: { default: credential },
    });
  });

  test("parse credential file", () => {
    expect(
      parseAppsScriptCredentialFile(
        JSON.stringify({
          version: 1,
          profiles: {
            default: {
              clientId: "client-id",
              clientSecret: "client-secret",
              refreshToken: "refresh-token",
              accessToken: "access-token",
              expiryDate: 123456789,
              scopes: ["https://www.googleapis.com/auth/script.projects"],
            },
          },
        }),
      ),
    ).toStrictEqual({
      version: 1,
      profiles: {
        default: {
          clientId: "client-id",
          clientSecret: "client-secret",
          refreshToken: "refresh-token",
          accessToken: "access-token",
          expiryDate: 123456789,
          scopes: ["https://www.googleapis.com/auth/script.projects"],
        },
      },
    });
  });

  test("allow credential without cached access token", () => {
    expect(
      parseAppsScriptCredentialFile(
        JSON.stringify({
          version: 1,
          profiles: {
            default: {
              clientId: "client-id",
              clientSecret: "client-secret",
              refreshToken: "refresh-token",
              scopes: ["https://www.googleapis.com/auth/script.projects"],
            },
          },
        }),
      ).profiles.default,
    ).toStrictEqual({
      clientId: "client-id",
      clientSecret: "client-secret",
      refreshToken: "refresh-token",
      scopes: ["https://www.googleapis.com/auth/script.projects"],
    });
  });

  test("reject invalid json", () => {
    expect(() => parseAppsScriptCredentialFile("{ invalid")).toThrow(
      "Invalid Apps Script credential file.",
    );
  });

  test("reject unsupported version", () => {
    expect(() =>
      parseAppsScriptCredentialFile(
        JSON.stringify({
          version: 2,
          profiles: {},
        }),
      ),
    ).toThrow("Unsupported Apps Script credential file version: 2");
  });

  test("reject missing required credential value", () => {
    expect(() =>
      parseAppsScriptCredentialFile(
        JSON.stringify({
          version: 1,
          profiles: {
            default: {
              clientId: "client-id",
              clientSecret: "client-secret",
              scopes: ["https://www.googleapis.com/auth/script.projects"],
            },
          },
        }),
      ),
    ).toThrow("Invalid Apps Script credential file.");
  });

  test("reject empty scopes", () => {
    expect(() =>
      parseAppsScriptCredentialFile(
        JSON.stringify({
          version: 1,
          profiles: {
            default: {
              clientId: "client-id",
              clientSecret: "client-secret",
              refreshToken: "refresh-token",
              scopes: [],
            },
          },
        }),
      ),
    ).toThrow("Invalid Apps Script credential file.");
  });

  test("preserve special profile name", () => {
    const file = parseAppsScriptCredentialFile(`
    {
      "version": 1,
      "profiles": {
        "__proto__": {
          "clientId": "client-id",
          "clientSecret": "client-secret",
          "refreshToken": "refresh-token",
          "scopes": [
            "https://www.googleapis.com/auth/script.projects"
          ]
        }
      }
    }
  `);

    expect(Object.hasOwn(file.profiles, "__proto__")).toBe(true);
    expect(file.profiles.__proto__).toStrictEqual({
      clientId: "client-id",
      clientSecret: "client-secret",
      refreshToken: "refresh-token",
      scopes: ["https://www.googleapis.com/auth/script.projects"],
    });
  });
});
