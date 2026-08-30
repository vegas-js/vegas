import { describe, expect, test, vi } from "vitest";

import type { ServiceCaller } from "../../../runtime/protocol";
import { Session } from "./Session";

describe("getActiveUser", () => {
  test("call callService with specific args", () => {
    const mockCallService = vi.fn((_service, _method, ..._args) => {});
    const session = new Session(mockCallService as ServiceCaller);
    session.getActiveUser();
    expect(mockCallService).toHaveBeenCalledWith("Session", "getActiveUser");
  });

  test("call callService only once", () => {
    const mockCallService = vi.fn((_service, _method, ..._args) => {});
    const session = new Session(mockCallService as ServiceCaller);
    session.getActiveUser();
    expect(mockCallService).toHaveBeenCalledOnce();
  });

  test("returns a User object containing the return value of callService", () => {
    const mockCallService = vi.fn((_service, _method, ..._args) => "active@example.com");
    const session = new Session(mockCallService as ServiceCaller);
    const user = session.getActiveUser();
    expect(user.getEmail()).toBe("active@example.com");
  });
});

describe("getActiveUserLocale", () => {
  test("call callService with specific args", () => {
    const mockCallService = vi.fn((_service, _method, ..._args) => {});
    const session = new Session(mockCallService as ServiceCaller);
    session.getActiveUserLocale();
    expect(mockCallService).toHaveBeenCalledWith("Session", "getActiveUserLocale");
  });

  test("call callService only once", () => {
    const mockCallService = vi.fn((_service, _method, ..._args) => {});
    const session = new Session(mockCallService as ServiceCaller);
    session.getActiveUserLocale();
    expect(mockCallService).toHaveBeenCalledOnce();
  });

  test("return the user locale of the callService return value", () => {
    const mockCallService = vi.fn((_service, _method, ..._args) => "en");
    const session = new Session(mockCallService as ServiceCaller);
    const locale = session.getActiveUserLocale();
    expect(locale).toBe("en");
  });
});

describe("getEffectiveUser", () => {
  test("call callService with specific args", () => {
    const mockCallService = vi.fn((_service, _method, ..._args) => {});
    const session = new Session(mockCallService as ServiceCaller);
    session.getEffectiveUser();
    expect(mockCallService).toHaveBeenCalledWith("Session", "getEffectiveUser");
  });

  test("call callService only once", () => {
    const mockCallService = vi.fn((_service, _method, ..._args) => {});
    const session = new Session(mockCallService as ServiceCaller);
    session.getEffectiveUser();
    expect(mockCallService).toHaveBeenCalledOnce();
  });

  test("returns a User object containing the return value of callService", () => {
    const mockCallService = vi.fn((_service, _method, ..._args) => "effective@example.com");
    const session = new Session(mockCallService as ServiceCaller);
    const user = session.getEffectiveUser();
    expect(user.getEmail()).toBe("effective@example.com");
  });
});

describe("getScriptTimeZone", () => {
  test("call callService with specific args", () => {
    const mockCallService = vi.fn((_service, _method, ..._args) => {});
    const session = new Session(mockCallService as ServiceCaller);
    session.getScriptTimeZone();
    expect(mockCallService).toHaveBeenCalledWith("Session", "getScriptTimeZone");
  });

  test("call callService only once", () => {
    const mockCallService = vi.fn((_service, _method, ..._args) => {});
    const session = new Session(mockCallService as ServiceCaller);
    session.getScriptTimeZone();
    expect(mockCallService).toHaveBeenCalledOnce();
  });

  test("return the timezone of the callService return value", () => {
    const mockCallService = vi.fn((_service, _method, ..._args) => "Etc/UTC");
    const session = new Session(mockCallService as ServiceCaller);
    const timeZone = session.getScriptTimeZone();
    expect(timeZone).toBe("Etc/UTC");
  });
});

describe("getTemporaryActiveUserKey", () => {
  test("call callService with specific args", () => {
    const mockCallService = vi.fn((_service, _method, ..._args) => {});
    const session = new Session(mockCallService as ServiceCaller);
    session.getTemporaryActiveUserKey();
    expect(mockCallService).toHaveBeenCalledWith("Session", "getTemporaryActiveUserKey");
  });

  test("call callService only once", () => {
    const mockCallService = vi.fn((_service, _method, ..._args) => {});
    const session = new Session(mockCallService as ServiceCaller);
    session.getTemporaryActiveUserKey();
    expect(mockCallService).toHaveBeenCalledOnce();
  });

  test("return the temporary key of the callService return value", () => {
    const mockCallService = vi.fn((_service, _method, ..._args) => "-- Active user key --");
    const session = new Session(mockCallService as ServiceCaller);
    const temporaryActiveUserKey = session.getTemporaryActiveUserKey();
    expect(temporaryActiveUserKey).toBe("-- Active user key --");
  });
});

describe("getTimeZone", () => {
  test("always throw an exception with message", () => {
    const mockCallService = vi.fn((_service, _method, ..._args) => {
      throw new Error("unexpected service call");
    });
    const session = new Session(mockCallService as ServiceCaller);
    expect(() => session.getTimeZone()).toThrow("Session#getTimeZone() is deprecated. Do not use.");
  });
});

describe("getUser", () => {
  test("always throw an exception with message", () => {
    const mockCallService = vi.fn((_service, _method, ..._args) => {
      throw new Error("unexpected service call");
    });
    const session = new Session(mockCallService as ServiceCaller);
    expect(() => session.getUser()).toThrow("Session#getUser() is deprecated. Do not use.");
  });
});
