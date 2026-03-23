import { expect, test, vi } from "vitest";

import { Session } from "./Session";

const deprecatedRegExp = / is deprecated\. Do not use\.$/;
const mockRequestSync = vi.fn(
  // oxlint-disable-next-line no-unused-vars
  (request: { message: string; payload?: any }, timeout?: number) => {},
);

test("call requestSync from getActiveUser.", () => {
  const session = new Session(mockRequestSync);
  session.getActiveUser();
  expect(mockRequestSync).toHaveBeenCalledWith({ message: "Session#getActiveUser" });
});

test("call requestSync from getActiveUserLocale.", () => {
  const session = new Session(mockRequestSync);
  session.getActiveUserLocale();
  expect(mockRequestSync).toHaveBeenCalledWith({ message: "Session#getActiveUserLocale" });
});

test("call requestSync from getEffectiveUser.", () => {
  const session = new Session(mockRequestSync);
  session.getEffectiveUser();
  expect(mockRequestSync).toHaveBeenCalledWith({ message: "Session#getEffectiveUser" });
});

test("call requestSync from getScriptTimeZone.", () => {
  const session = new Session(mockRequestSync);
  session.getScriptTimeZone();
  expect(mockRequestSync).toHaveBeenCalledWith({ message: "Session#getScriptTimeZone" });
});

test("call requestSync from getTemporaryActiveUserKey.", () => {
  const session = new Session(mockRequestSync);
  session.getTemporaryActiveUserKey();
  expect(mockRequestSync).toHaveBeenCalledWith({ message: "Session#getTemporaryActiveUserKey" });
});

test("getTimeZone() always throws an exception.", () => {
  const session = new Session(mockRequestSync);
  expect(() => session.getTimeZone()).toThrow(deprecatedRegExp);
});

test("getUser() always throws an exception.", () => {
  const session = new Session(mockRequestSync);
  expect(() => session.getUser()).toThrow(deprecatedRegExp);
});
