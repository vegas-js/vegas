import { expect, test } from "vitest";

import type { RuntimeServicePort } from "../../runtime/protocol";
import { createSession } from "./session";

const service: RuntimeServicePort<"Session"> = {
  getActiveUser: () => "",
  getActiveUserLocale: () => "",
  getEffectiveUser: () => "",
  getScriptTimeZone: () => "",
  getTemporaryActiveUserKey: () => "",
};

test("provides deprecated Session methods with GAS-compatible semantics", () => {
  const session = createSession(service) as any;

  expect(session.getTimeZone()).toBe(session.getScriptTimeZone());
  expect(session.getUser().getEmail()).toBe(session.getActiveUser().getEmail());
});

test("creates GAS-compatible Session facade", () => {
  const session = createSession(service) as any;

  expect(String(session)).toBe("Session");

  expect(Object.getPrototypeOf(session)).toBe(Object.prototype);

  expect(Object.hasOwn(session, "getActiveUser")).toBe(true);
  expect(Object.hasOwn(session, "getUser")).toBe(true);
  expect(Object.hasOwn(session, "toString")).toBe(true);
});
