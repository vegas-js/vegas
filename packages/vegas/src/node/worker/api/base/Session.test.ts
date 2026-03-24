import { describe, expect, test, vi } from "vitest";

import { Session } from "./Session";

describe("getActiveUser", () => {
  test("call requestSync with message", () => {
    const mockRequestSync = vi.fn(
      // oxlint-disable-next-line no-unused-vars
      (request: { message: string; payload?: any }, timeout?: number) => {},
    );
    const session = new Session(mockRequestSync);
    session.getActiveUser();
    expect(mockRequestSync).toHaveBeenCalledWith({ message: "Session#getActiveUser" });
  });

  test("call requestSync only once", () => {
    const mockRequestSync = vi.fn(
      // oxlint-disable-next-line no-unused-vars
      (request: { message: string; payload?: any }, timeout?: number) => {},
    );
    const session = new Session(mockRequestSync);
    session.getActiveUser();
    expect(mockRequestSync).toHaveBeenCalledOnce();
  });

  test("returns a User object containing the return value of requestSync", () => {
    const mockRequestSync = vi.fn(
      // oxlint-disable-next-line no-unused-vars
      (request: { message: string; payload?: any }, timeout?: number) => "active@example.com",
    );
    const session = new Session(mockRequestSync);
    const user = session.getActiveUser();
    expect(user.getEmail()).toBe("active@example.com");
  });
});

describe("getActiveUserLocale", () => {
  test("call requestSync with message", () => {
    const mockRequestSync = vi.fn(
      // oxlint-disable-next-line no-unused-vars
      (request: { message: string; payload?: any }, timeout?: number) => {},
    );
    const session = new Session(mockRequestSync);
    session.getActiveUserLocale();
    expect(mockRequestSync).toHaveBeenCalledWith({ message: "Session#getActiveUserLocale" });
  });

  test("call requestSync only once", () => {
    const mockRequestSync = vi.fn(
      // oxlint-disable-next-line no-unused-vars
      (request: { message: string; payload?: any }, timeout?: number) => {},
    );
    const session = new Session(mockRequestSync);
    session.getActiveUserLocale();
    expect(mockRequestSync).toHaveBeenCalledOnce();
  });

  test("return the user locale of the requestSync return value", () => {
    const mockRequestSync = vi.fn(
      // oxlint-disable-next-line no-unused-vars
      (request: { message: string; payload?: any }, timeout?: number) => "en",
    );
    const session = new Session(mockRequestSync);
    const locale = session.getActiveUserLocale();
    expect(locale).toBe("en");
  });
});

describe("getEffectiveUser", () => {
  test("call requestSync with message", () => {
    const mockRequestSync = vi.fn(
      // oxlint-disable-next-line no-unused-vars
      (request: { message: string; payload?: any }, timeout?: number) => {},
    );
    const session = new Session(mockRequestSync);
    session.getEffectiveUser();
    expect(mockRequestSync).toHaveBeenCalledWith({ message: "Session#getEffectiveUser" });
  });

  test("call requestSync only once", () => {
    const mockRequestSync = vi.fn(
      // oxlint-disable-next-line no-unused-vars
      (request: { message: string; payload?: any }, timeout?: number) => {},
    );
    const session = new Session(mockRequestSync);
    session.getEffectiveUser();
    expect(mockRequestSync).toHaveBeenCalledOnce();
  });

  test("returns a User object containing the return value of requestSync", () => {
    const mockRequestSync = vi.fn(
      // oxlint-disable-next-line no-unused-vars
      (request: { message: string; payload?: any }, timeout?: number) => "effective@example.com",
    );
    const session = new Session(mockRequestSync);
    const user = session.getEffectiveUser();
    expect(user.getEmail()).toBe("effective@example.com");
  });
});

describe("getScriptTimeZone", () => {
  test("call requestSync with message", () => {
    const mockRequestSync = vi.fn(
      // oxlint-disable-next-line no-unused-vars
      (request: { message: string; payload?: any }, timeout?: number) => {},
    );
    const session = new Session(mockRequestSync);
    session.getScriptTimeZone();
    expect(mockRequestSync).toHaveBeenCalledWith({ message: "Session#getScriptTimeZone" });
  });

  test("call requestSync only once", () => {
    const mockRequestSync = vi.fn(
      // oxlint-disable-next-line no-unused-vars
      (request: { message: string; payload?: any }, timeout?: number) => {},
    );
    const session = new Session(mockRequestSync);
    session.getScriptTimeZone();
    expect(mockRequestSync).toHaveBeenCalledOnce();
  });

  test("return the timezone of the requestSync return value", () => {
    const mockRequestSync = vi.fn(
      // oxlint-disable-next-line no-unused-vars
      (request: { message: string; payload?: any }, timeout?: number) => "Etc/UTC",
    );
    const session = new Session(mockRequestSync);
    const timeZone = session.getScriptTimeZone();
    expect(timeZone).toBe("Etc/UTC");
  });
});

describe("getTemporaryActiveUserKey", () => {
  test("call requestSync with message", () => {
    const mockRequestSync = vi.fn(
      // oxlint-disable-next-line no-unused-vars
      (request: { message: string; payload?: any }, timeout?: number) => {},
    );
    const session = new Session(mockRequestSync);
    session.getTemporaryActiveUserKey();
    expect(mockRequestSync).toHaveBeenCalledWith({ message: "Session#getTemporaryActiveUserKey" });
  });

  test("call requestSync only once", () => {
    const mockRequestSync = vi.fn(
      // oxlint-disable-next-line no-unused-vars
      (request: { message: string; payload?: any }, timeout?: number) => {},
    );
    const session = new Session(mockRequestSync);
    session.getTemporaryActiveUserKey();
    expect(mockRequestSync).toHaveBeenCalledOnce();
  });

  test("return the temporary key of the requestSync return value", () => {
    const mockRequestSync = vi.fn(
      // oxlint-disable-next-line no-unused-vars
      (request: { message: string; payload?: any }, timeout?: number) => "-- Active user key --",
    );
    const session = new Session(mockRequestSync);
    const temporaryActiveUserKey = session.getTemporaryActiveUserKey();
    expect(temporaryActiveUserKey).toBe("-- Active user key --");
  });
});

describe("getTimeZone", () => {
  test("always throw an exception with message", () => {
    const mockRequestSync = vi.fn(
      // oxlint-disable-next-line no-unused-vars
      (request: { message: string; payload?: any }, timeout?: number) => {},
    );
    const session = new Session(mockRequestSync);
    expect(() => session.getTimeZone()).toThrow("Session#getTimeZone() is deprecated. Do not use.");
  });
});

describe("getUser", () => {
  test("always throw an exception with message", () => {
    const mockRequestSync = vi.fn(
      // oxlint-disable-next-line no-unused-vars
      (request: { message: string; payload?: any }, timeout?: number) => {},
    );
    const session = new Session(mockRequestSync);
    expect(() => session.getUser()).toThrow("Session#getUser() is deprecated. Do not use.");
  });
});
