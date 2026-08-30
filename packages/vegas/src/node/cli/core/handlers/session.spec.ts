import { expect, test } from "vitest";

import type { ServeContext } from "../context";
import { SessionHandler } from "./session";

type ExecuteAs = "USER_ACCESSING" | "USER_DEPLOYING";

function createContext({
  executeAs = "USER_ACCESSING",
  timeZone = "UTC",
  sessionMock = {},
}: {
  executeAs?: ExecuteAs;
  timeZone?: string;
  sessionMock?: Record<string, string>;
} = {}): ServeContext {
  return {
    config: {
      gas: {
        webapp: {
          executeAs,
        },
        timeZone,
      },
    },
    mock: {
      Session: sessionMock,
    },
  } as unknown as ServeContext;
}

test("uses active user when executing as accessing user", () => {
  const handler = new SessionHandler(
    createContext({
      executeAs: "USER_ACCESSING",
      sessionMock: {
        activeUserEmail: "active@example.com",
        effectiveUserEmail: "effective@example.com",
      },
    }),
  );

  expect(handler.getActiveUser()).toBe("active@example.com");
  expect(handler.getEffectiveUser()).toBe("active@example.com");
});

test("uses effective user when executing as deploying user", () => {
  const handler = new SessionHandler(
    createContext({
      executeAs: "USER_DEPLOYING",
      sessionMock: {
        activeUserEmail: "active@example.com",
        effectiveUserEmail: "effective@example.com",
      },
    }),
  );

  expect(handler.getActiveUser()).toBe("effective@example.com");
  expect(handler.getEffectiveUser()).toBe("effective@example.com");
});

test("gets active user locale", () => {
  const handler = new SessionHandler(
    createContext({
      sessionMock: {
        activeUserLocale: "en",
      },
    }),
  );

  expect(handler.getActiveUserLocale()).toBe("en");
});

test("gets script time zone", () => {
  const handler = new SessionHandler(
    createContext({
      timeZone: "America/New_York",
    }),
  );

  expect(handler.getScriptTimeZone()).toBe("America/New_York");
});

test("gets temporary active user key", () => {
  const handler = new SessionHandler(
    createContext({
      sessionMock: {
        temporaryActiveUserKey: "temporary-key",
      },
    }),
  );

  expect(handler.getTemporaryActiveUserKey()).toBe("temporary-key");
});

test("uses default session values", () => {
  const handler = new SessionHandler(createContext());

  expect(handler.getActiveUser()).toBe("active@gmail.com");
  expect(handler.getActiveUserLocale()).toBe("en");
  expect(handler.getScriptTimeZone()).toBe("UTC");
});
