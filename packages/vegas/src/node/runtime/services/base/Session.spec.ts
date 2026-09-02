import { describe, expect, test, vi } from "vitest";

import type { RuntimeServicePort } from "../../protocol";
import { Session } from "./Session";

function createSessionService(
  overrides: Partial<RuntimeServicePort<"Session">> = {},
): RuntimeServicePort<"Session"> {
  return {
    getActiveUser: () => "",
    getActiveUserLocale: () => "",
    getEffectiveUser: () => "",
    getScriptTimeZone: () => "",
    getTemporaryActiveUserKey: () => "",
    ...overrides,
  };
}

describe("getActiveUser", () => {
  test("call callService with specific args", () => {
    const getActiveUser = vi.fn();
    const session = new Session(createSessionService({ getActiveUser }));
    session.getActiveUser();
    const args = getActiveUser.mock.lastCall;
    expect(args?.length).toBe(0);
  });

  test("call callService only once", () => {
    const getActiveUser = vi.fn();
    const session = new Session(createSessionService({ getActiveUser }));
    session.getActiveUser();
    expect(getActiveUser).toHaveBeenCalledOnce();
  });

  test("returns a User object containing the return value of callService", () => {
    const getActiveUser = vi.fn(() => "active@example.com");
    const session = new Session(createSessionService({ getActiveUser }));
    const user = session.getActiveUser();
    expect(user.getEmail()).toBe("active@example.com");
  });
});

describe("getActiveUserLocale", () => {
  test("call callService with specific args", () => {
    const getActiveUserLocale = vi.fn();
    const session = new Session(createSessionService({ getActiveUserLocale }));
    session.getActiveUserLocale();
    const args = getActiveUserLocale.mock.lastCall;
    expect(args?.length).toBe(0);
  });

  test("call callService only once", () => {
    const getActiveUserLocale = vi.fn();
    const session = new Session(createSessionService({ getActiveUserLocale }));
    session.getActiveUserLocale();
    expect(getActiveUserLocale).toHaveBeenCalledOnce();
  });

  test("return the user locale of the callService return value", () => {
    const getActiveUserLocale = vi.fn(() => "en");
    const session = new Session(createSessionService({ getActiveUserLocale }));
    expect(session.getActiveUserLocale()).toBe("en");
  });
});

describe("getEffectiveUser", () => {
  test("call callService with specific args", () => {
    const getEffectiveUser = vi.fn();
    const session = new Session(createSessionService({ getEffectiveUser }));
    session.getEffectiveUser();
    const args = getEffectiveUser.mock.lastCall;
    expect(args?.length).toBe(0);
  });

  test("call callService only once", () => {
    const getEffectiveUser = vi.fn();
    const session = new Session(createSessionService({ getEffectiveUser }));
    session.getEffectiveUser();
    expect(getEffectiveUser).toHaveBeenCalledOnce();
  });

  test("returns a User object containing the return value of callService", () => {
    const getEffectiveUser = vi.fn(() => "effective@example.com");
    const session = new Session(createSessionService({ getEffectiveUser }));
    const user = session.getEffectiveUser();
    expect(user.getEmail()).toBe("effective@example.com");
  });
});

describe("getScriptTimeZone", () => {
  test("call callService with specific args", () => {
    const getScriptTimeZone = vi.fn();
    const session = new Session(createSessionService({ getScriptTimeZone }));
    session.getScriptTimeZone();
    const args = getScriptTimeZone.mock.lastCall;
    expect(args?.length).toBe(0);
  });

  test("call callService only once", () => {
    const getScriptTimeZone = vi.fn();
    const session = new Session(createSessionService({ getScriptTimeZone }));
    session.getScriptTimeZone();
    expect(getScriptTimeZone).toHaveBeenCalledOnce();
  });

  test("return the timezone of the callService return value", () => {
    const getScriptTimeZone = vi.fn(() => "Etc/UTC");
    const session = new Session(createSessionService({ getScriptTimeZone }));
    const timeZone = session.getScriptTimeZone();
    expect(timeZone).toBe("Etc/UTC");
  });
});

describe("getTemporaryActiveUserKey", () => {
  test("call callService with specific args", () => {
    const getTemporaryActiveUserKey = vi.fn();
    const session = new Session(createSessionService({ getTemporaryActiveUserKey }));
    session.getTemporaryActiveUserKey();
    const args = getTemporaryActiveUserKey.mock.lastCall;
    expect(args?.length).toBe(0);
  });

  test("call callService only once", () => {
    const getTemporaryActiveUserKey = vi.fn();
    const session = new Session(createSessionService({ getTemporaryActiveUserKey }));
    session.getTemporaryActiveUserKey();
    expect(getTemporaryActiveUserKey).toHaveBeenCalledOnce();
  });

  test("return the temporary key of the callService return value", () => {
    const getTemporaryActiveUserKey = vi.fn(() => "-- Active user key --");
    const session = new Session(createSessionService({ getTemporaryActiveUserKey }));
    const temporaryActiveUserKey = session.getTemporaryActiveUserKey();
    expect(temporaryActiveUserKey).toBe("-- Active user key --");
  });
});

describe("getTimeZone", () => {
  test("call callService with specific args via getScriptTimeZone", () => {
    const getScriptTimeZone = vi.fn();
    const session = new Session(createSessionService({ getScriptTimeZone }));
    session.getTimeZone();
    const args = getScriptTimeZone.mock.lastCall;
    expect(args?.length).toBe(0);
  });

  test("call callService only once via getScriptTimeZone", () => {
    const getScriptTimeZone = vi.fn();
    const session = new Session(createSessionService({ getScriptTimeZone }));
    session.getTimeZone();
    expect(getScriptTimeZone).toHaveBeenCalledOnce();
  });

  test("return the timezone of the callService return value via getScriptTimeZone", () => {
    const getScriptTimeZone = vi.fn(() => "Etc/UTC");
    const session = new Session(createSessionService({ getScriptTimeZone }));
    const timeZone = session.getTimeZone();
    expect(timeZone).toBe("Etc/UTC");
  });
});

describe("getUser", () => {
  test("call callService with specific args via getActiveUser", () => {
    const getActiveUser = vi.fn();
    const session = new Session(createSessionService({ getActiveUser }));
    session.getUser();
    const args = getActiveUser.mock.lastCall;
    expect(args?.length).toBe(0);
  });

  test("call callService only once via getActiveUser", () => {
    const getActiveUser = vi.fn();
    const session = new Session(createSessionService({ getActiveUser }));
    session.getUser();
    expect(getActiveUser).toHaveBeenCalledOnce();
  });

  test("returns a User object containing the return value of callService via getActiveUser", () => {
    const getActiveUser = vi.fn(() => "active@example.com");
    const session = new Session(createSessionService({ getActiveUser }));
    const user = session.getUser();
    expect(user.getEmail()).toBe("active@example.com");
  });
});
