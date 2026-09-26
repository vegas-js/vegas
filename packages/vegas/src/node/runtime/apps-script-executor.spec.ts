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
  type BlobConversionCapability,
  type UrlFetchCapability,
} from "./index";

const blobConversionCapability: BlobConversionCapability = {
  async convert(value, contentType) {
    return {
      ...value,
      contentType,
    };
  },
};

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
      const converted = await dispatcher.dispatch({
        service: "blob",
        operation: "convert",
        value: {
          bytes: [86, 101, 103, 97, 115],
          contentType: "text/plain",
          name: "vegas.txt",
          googleType: false,
        },
        contentType: "application/pdf",
      });

      return {
        functionName: request.functionName,
        name,
        acquired,
        converted,
      };
    };

    const executor = createAppsScriptExecutor({
      blobConversionCapability,
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
      converted: {
        bytes: [86, 101, 103, 97, 115],
        contentType: "application/pdf",
        name: "vegas.txt",
        googleType: false,
      },
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
      blobConversionCapability,
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

  test("release invocation locks when the worker runner throws synchronously", async () => {
    const lockStore = new InMemoryLockStore();
    const runWorker: AppsScriptWorkerRunner = (dispatcher) => {
      void dispatcher.dispatch({
        service: "lock",
        operation: "acquire",
        namespace: "script",
        timeoutInMillis: 0,
      });

      throw new Error("worker failed synchronously");
    };

    const executor = createAppsScriptExecutor({
      blobConversionCapability,
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
    ).rejects.toThrow("worker failed synchronously");

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
