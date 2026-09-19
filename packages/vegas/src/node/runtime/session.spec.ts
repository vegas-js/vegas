import { describe, expect, test } from "vitest";

import { createSession, Session, User, type InvocationEnvironment } from "./index";

const ENVIRONMENT = {
  activeUserEmail: "active@example.com",
  activeUserLocale: "ja",
  effectiveUserEmail: "effective@example.com",
  scriptTimeZone: "Asia/Tokyo",
  temporaryActiveUserKey: "temporary-user-key",
} as const satisfies InvocationEnvironment;

// https://developers.google.com/apps-script/reference/base/session
describe("Session Runtime object", () => {
  test("expose invocation environment values without host calls", () => {
    const session = createSession(ENVIRONMENT);

    expect(session).toBeInstanceOf(Session);
    expect(session.getActiveUserLocale()).toBe("ja");
    expect(session.getScriptTimeZone()).toBe("Asia/Tokyo");
    expect(session.getTemporaryActiveUserKey()).toBe("temporary-user-key");
  });

  test("expose active and effective users as distinct User objects", () => {
    const session = createSession(ENVIRONMENT);

    const activeUser = session.getActiveUser();
    const effectiveUser = session.getEffectiveUser();

    expect(activeUser).toBeInstanceOf(User);
    expect(activeUser.getEmail()).toBe("active@example.com");
    expect(effectiveUser).toBeInstanceOf(User);
    expect(effectiveUser.getEmail()).toBe("effective@example.com");
    expect(activeUser).not.toBe(effectiveUser);
  });

  test("support documented deprecated Session aliases", () => {
    const session = createSession(ENVIRONMENT);

    expect(session.getTimeZone()).toBe(session.getScriptTimeZone());
    expect(session.getUser().getEmail()).toBe(session.getActiveUser().getEmail());
  });
});
