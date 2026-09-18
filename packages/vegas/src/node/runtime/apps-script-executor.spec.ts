import { describe, expect, test } from "vitest";

import {
  createAppsScriptExecutor,
  InMemoryCacheStore,
  InMemoryDriveIteratorStore,
  InMemoryDriveStore,
  InMemoryLockStore,
  InMemoryPropertiesStore,
  InMemorySpreadsheetStore,
  type AppsScriptWorkerRunner,
  type UrlFetchCapability,
} from "./index";

const urlFetchCapability: UrlFetchCapability = {
  async fetch() {
    throw new Error("unexpected UrlFetch call");
  },
  async fetchAll() {
    throw new Error("unexpected UrlFetch call");
  },
};

const environment = {
  activeUserEmail: "",
  activeUserLocale: "en",
  effectiveUserEmail: "",
  scriptTimeZone: "UTC",
  temporaryActiveUserKey: "",
};

const scope = {
  scriptKey: "script-a",
  userKey: "user-a",
};

describe("createAppsScriptExecutor", () => {
  test("compose invocation-scoped Host handlers around the worker runner", async () => {
    const lockStore = new InMemoryLockStore();
    const runWorker: AppsScriptWorkerRunner = async (dispatcher, request) => {
      await dispatcher.dispatch({
        service: "properties",
        operation: "set",
        namespace: "script",
        key: "name",
        value: "Vegas",
      });

      const name = await dispatcher.dispatch({
        service: "properties",
        operation: "get",
        namespace: "script",
        key: "name",
      });
      const acquired = await dispatcher.dispatch({
        service: "lock",
        operation: "acquire",
        namespace: "script",
        timeoutInMillis: 0,
      });

      return {
        functionName: request.functionName,
        name,
        acquired,
      };
    };

    const executor = createAppsScriptExecutor({
      cacheStore: new InMemoryCacheStore(),
      driveIteratorStore: new InMemoryDriveIteratorStore(),
      driveStore: new InMemoryDriveStore(),
      lockStore,
      propertiesStore: new InMemoryPropertiesStore(),
      spreadsheetStore: new InMemorySpreadsheetStore(),
      urlFetchCapability,
      runWorker,
    });

    await expect(
      executor.execute({
        program: {
          source: "",
          htmlFiles: {},
        },
        functionName: "main",
        args: [],
        environment,
        scope,
      }),
    ).resolves.toStrictEqual({
      functionName: "main",
      name: "Vegas",
      acquired: true,
    });

    const nextLockSession = lockStore.createSession();
    await expect(
      nextLockSession.acquire(
        {
          kind: "script",
          scriptKey: "script-a",
        },
        0,
      ),
    ).resolves.toBe(true);
  });

  test("release invocation locks when the worker runner fails", async () => {
    const lockStore = new InMemoryLockStore();
    const runWorker: AppsScriptWorkerRunner = async (dispatcher) => {
      await dispatcher.dispatch({
        service: "lock",
        operation: "acquire",
        namespace: "script",
        timeoutInMillis: 0,
      });

      throw new Error("worker failed");
    };

    const executor = createAppsScriptExecutor({
      cacheStore: new InMemoryCacheStore(),
      driveIteratorStore: new InMemoryDriveIteratorStore(),
      driveStore: new InMemoryDriveStore(),
      lockStore,
      propertiesStore: new InMemoryPropertiesStore(),
      spreadsheetStore: new InMemorySpreadsheetStore(),
      urlFetchCapability,
      runWorker,
    });

    await expect(
      executor.execute({
        program: {
          source: "",
          htmlFiles: {},
        },
        functionName: "main",
        args: [],
        environment,
        scope,
      }),
    ).rejects.toThrow("worker failed");

    const nextLockSession = lockStore.createSession();
    await expect(
      nextLockSession.acquire(
        {
          kind: "script",
          scriptKey: "script-a",
        },
        0,
      ),
    ).resolves.toBe(true);
  });
});
