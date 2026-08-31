import { expect, test, vi } from "vitest";

import { dispatchRuntimeRequest } from "./dispatcher";
import type { RuntimeRequest, RuntimeServiceRegistry } from "./protocol";

function createRegistry(overrides: Partial<RuntimeServiceRegistry> = {}): RuntimeServiceRegistry {
  return {
    Range: {
      getValue: () => undefined,
      getValues: () => [],
      setValue: () => {},
      setValues: () => {},
    },
    UrlFetch: {
      fetch: () => ({
        headers: {},
        content: [],
        responseCode: 200,
      }),
      fetchAll: () => [],
    },
    Html: {
      getFileContent: () => "",
    },
    Session: {
      getActiveUser: () => "",
      getActiveUserLocale: () => "",
      getEffectiveUser: () => "",
      getScriptTimeZone: () => "",
      getTemporaryActiveUserKey: () => "",
    },
    Cache: {
      get: () => null,
      getAll: () => {
        return {};
      },
      put: () => {},
      putAll: () => {},
      remove: () => {},
      removeAll: () => {},
    },
    Properties: {
      deleteAllProperties: () => {},
      deleteProperty: () => {},
      getKeys: () => [],
      getProperties: () => {
        return {};
      },
      getProperty: () => null,
      setProperties: () => {},
      setProperty: () => {},
    },
    ...overrides,
  };
}

test("dispatch zero-argument operation", async () => {
  const getActiveUser = vi.fn(() => "user@example.com");
  const services = createRegistry({
    Session: {
      getActiveUser,
      getActiveUserLocale: () => "",
      getEffectiveUser: () => "",
      getScriptTimeZone: () => "",
      getTemporaryActiveUserKey: () => "",
    },
  });
  const result = await dispatchRuntimeRequest(services, {
    type: "service-call",
    service: "Session",
    method: "getActiveUser",
    args: [],
  });

  expect(result).toBe("user@example.com");
  expect(getActiveUser).toHaveBeenCalledWith();
});

test("passes request args to operation", async () => {
  const payload = {
    spreadsheetId: "spreadsheet",
    sheetId: 1,
    range: {
      row: 2,
      column: 3,
    },
  };
  const getValue = vi.fn(() => "value");
  const services = createRegistry({
    Range: {
      getValue,
      getValues: () => [],
      setValue: () => {},
      setValues: () => {},
    },
  });
  const result = await dispatchRuntimeRequest(services, {
    type: "service-call",
    service: "Range",
    method: "getValue",
    args: [payload],
  });

  expect(getValue).toHaveBeenCalledWith(payload);
  expect(result).toBe("value");
});

test("preserves service receiver", async () => {
  const session = {
    value: "user@example.com",
    getActiveUser() {
      return this.value;
    },
    getActiveUserLocale() {
      return "";
    },
    getEffectiveUser() {
      return "";
    },
    getScriptTimeZone() {
      return "";
    },
    getTemporaryActiveUserKey() {
      return "";
    },
  };
  const services = createRegistry({
    Session: session,
  });
  const result = await dispatchRuntimeRequest(services, {
    type: "service-call",
    service: "Session",
    method: "getActiveUser",
    args: [],
  });

  expect(result).toBe("user@example.com");
});

test("awaits async operation", async () => {
  const services = createRegistry({
    Session: {
      getActiveUser: async () => "user@example.com",
      getActiveUserLocale: () => "",
      getEffectiveUser: () => "",
      getScriptTimeZone: () => "",
      getTemporaryActiveUserKey: () => "",
    },
  });
  const result = await dispatchRuntimeRequest(services, {
    type: "service-call",
    service: "Session",
    method: "getActiveUser",
    args: [],
  });

  expect(result).toBe("user@example.com");
});

test("rejects unknown service", async () => {
  const request = {
    type: "service-call",
    service: "Unknown",
    method: "foo",
    args: [],
  } as unknown as RuntimeRequest;

  await expect(dispatchRuntimeRequest(createRegistry(), request)).rejects.toThrow(
    "Unknown runtime service: Unknown",
  );
});

test("rejects unknown method", async () => {
  const request = {
    type: "service-call",
    service: "Session",
    method: "unknown",
    args: [],
  } as unknown as RuntimeRequest;

  await expect(dispatchRuntimeRequest(createRegistry(), request)).rejects.toThrow(
    "Unknown runtime method: Session.unknown",
  );
});
