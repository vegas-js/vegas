import { expect, test } from "vitest";

import type { SessionEnvironment } from "./session";
import { SessionHandler } from "./session";

function createEnvironment(overrides: Partial<SessionEnvironment> = {}): SessionEnvironment {
  return {
    executeAs: "USER_ACCESSING",
    timeZone: "UTC",
    ...overrides,
  };
}

test("uses active user when executing as accessing user", () => {
  const handler = new SessionHandler(
    createEnvironment({
      activeUserEmail: "active@example.com",
      effectiveUserEmail: "effective@example.com",
    }),
  );

  expect(handler.getActiveUser()).toBe("active@example.com");
  expect(handler.getEffectiveUser()).toBe("active@example.com");
});

test("uses effective user when executing as deploying user", () => {
  const handler = new SessionHandler(
    createEnvironment({
      executeAs: "USER_DEPLOYING",
      activeUserEmail: "active@example.com",
      effectiveUserEmail: "effective@example.com",
    }),
  );

  expect(handler.getActiveUser()).toBe("effective@example.com");
  expect(handler.getEffectiveUser()).toBe("effective@example.com");
});

test("gets active user locale", () => {
  const handler = new SessionHandler(createEnvironment({ activeUserLocale: "ja" }));

  expect(handler.getActiveUserLocale()).toBe("ja");
});

test("gets script time zone", () => {
  const handler = new SessionHandler(createEnvironment({ timeZone: "Asia/Tokyo" }));

  expect(handler.getScriptTimeZone()).toBe("Asia/Tokyo");
});

test("gets temporary active user key", () => {
  const handler = new SessionHandler(
    createEnvironment({ temporaryActiveUserKey: "-- Active user key --" }),
  );

  expect(handler.getTemporaryActiveUserKey()).toBe("-- Active user key --");
});

test("uses default session values", () => {
  const handler = new SessionHandler(createEnvironment());

  expect(handler.getActiveUser()).toBe("active@gmail.com");
  expect(handler.getActiveUserLocale()).toBe("en");
  expect(handler.getScriptTimeZone()).toBe("UTC");
});
