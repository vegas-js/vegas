import { beforeEach, describe, expect, test, vi } from "vitest";

import { loginGoogleAppsScriptUser } from "../push";
import { runAuth } from "./auth-login";

vi.mock("../push", () => ({
  loginGoogleAppsScriptUser: vi.fn(),
}));

const loginGoogleAppsScriptUserMock = vi.mocked(loginGoogleAppsScriptUser);

beforeEach(() => {
  loginGoogleAppsScriptUserMock.mockReset();
});

describe("runAuth", () => {
  test("dispatch login", async () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});

    await runAuth("login", "client.json", {
      profile: "work",
    });

    expect(loginGoogleAppsScriptUserMock).toHaveBeenCalledWith({
      clientFilePath: "client.json",
      profile: "work",
    });

    expect(consoleMock).toHaveBeenCalledWith(
      '✓ Signed in to Google for Apps Script using profile "work".',
    );
  });
  test("reject unknown auth command", async () => {
    await expect(runAuth("logout", undefined, {})).rejects.toThrow(
      'Unknown auth command "logout". Expected "login".',
    );

    expect(loginGoogleAppsScriptUserMock).not.toHaveBeenCalled();
  });

  test("require OAuth client file for login", async () => {
    await expect(runAuth("login", undefined, {})).rejects.toThrow(
      "OAuth client JSON is required. Usage: vegas auth login <client-file>.",
    );

    expect(loginGoogleAppsScriptUserMock).not.toHaveBeenCalled();
  });

  test("reject empty auth profile", async () => {
    await expect(
      runAuth("login", "client.json", {
        profile: "   ",
      }),
    ).rejects.toThrow("Apps Script auth profile must not be empty.");

    expect(loginGoogleAppsScriptUserMock).not.toHaveBeenCalled();
  });
});
