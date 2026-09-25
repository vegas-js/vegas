import { describe, expect, test } from "vitest";

import { createSession, Session, User, type InvocationEnvironment } from "./index";

const ENVIRONMENT = {
  activeUserEmail: "active@example.com",
  activeUserLocale: "ja",
  effectiveUserEmail: "effective@example.com",
  scriptTimeZone: "Asia/Tokyo",
  temporaryActiveUserKey: "temporary-user-key",
} as const satisfies InvocationEnvironment;

// Public contracts:
// https://developers.google.com/apps-script/reference/base/session
// https://developers.google.com/apps-script/reference/base/user
describe("Session and User public contracts", () => {
  test("expose active and effective user information and session settings", () => {
    const session = createSession(ENVIRONMENT);

    expect(session).toBeInstanceOf(Session);

    const activeUser = session.getActiveUser();
    const effectiveUser = session.getEffectiveUser();

    expect(activeUser).toBeInstanceOf(User);
    expect(activeUser.getEmail()).toBe("active@example.com");
    expect(effectiveUser).toBeInstanceOf(User);
    expect(effectiveUser.getEmail()).toBe("effective@example.com");
    expect(session.getActiveUserLocale()).toBe("ja");
    expect(session.getScriptTimeZone()).toBe("Asia/Tokyo");

    // Apps Script owns the 30-day rotation and script-scoped uniqueness of this key. The local
    // runtime verifies the currently seeded anonymous key without simulating Google's lifecycle.
    expect(session.getTemporaryActiveUserKey()).toBe("temporary-user-key");

    expect(session.getTimeZone()).toBe(session.getScriptTimeZone());
    expect(session.getUser().getEmail()).toBe(activeUser.getEmail());
    expect(activeUser.getUserLoginId()).toBe(activeUser.getEmail());
  });

  test("represent an unavailable active-user email as a blank string", () => {
    const session = createSession({
      ...ENVIRONMENT,
      activeUserEmail: "",
    });

    expect(session.getActiveUser().getEmail()).toBe("");
  });
});
