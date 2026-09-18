import { CacheHostHandler } from "./cache-host-handler";
import type { CacheStore } from "./cache-store";
import { LocalDriveHostHandler } from "./drive-host-handler";
import type { DriveIteratorStore } from "./drive-iterator-store";
import { resolveDriveNamespace } from "./drive-namespace";
import type { DriveStore } from "./drive-store";
import type { ExecutionRequest, Executor } from "./executor";
import { HostDispatcher } from "./host-dispatcher";
import type { HostCallDispatcher } from "./host-dispatcher";
import { LockHostHandler } from "./lock-host-handler";
import type { LockStore } from "./lock-store";
import { PropertiesHostHandler } from "./properties-host-handler";
import type { PropertiesStore } from "./properties-store";
import { SpreadsheetHostHandler } from "./spreadsheet-host-handler";
import type { SpreadsheetStore } from "./spreadsheet-store";
import type { UrlFetchCapability } from "./url-fetch-capability";
import { UrlFetchHostHandler } from "./url-fetch-host-handler";

export type AppsScriptWorkerRunner = (
  dispatcher: HostCallDispatcher,
  request: ExecutionRequest,
) => Promise<unknown>;

export interface AppsScriptExecutorOptions {
  readonly cacheStore: CacheStore;
  readonly driveIteratorStore: DriveIteratorStore;
  readonly driveStore: DriveStore;
  readonly lockStore: LockStore;
  readonly propertiesStore: PropertiesStore;
  readonly spreadsheetStore: SpreadsheetStore;
  readonly urlFetchCapability: UrlFetchCapability;
  readonly runWorker: AppsScriptWorkerRunner;
}

export function createAppsScriptExecutor(options: AppsScriptExecutorOptions): Executor {
  const urlFetch = new UrlFetchHostHandler(options.urlFetchCapability);

  return {
    execute(request) {
      const driveNamespace = resolveDriveNamespace(request.scope);
      const lockSession = options.lockStore.createSession();
      const dispatcher = new HostDispatcher({
        cache: new CacheHostHandler(options.cacheStore, request.scope),
        drive: new LocalDriveHostHandler(
          options.driveStore,
          driveNamespace,
          options.driveIteratorStore.createSession(driveNamespace),
        ),
        lock: new LockHostHandler(lockSession, request.scope),
        properties: new PropertiesHostHandler(options.propertiesStore, request.scope),
        spreadsheet: new SpreadsheetHostHandler(options.spreadsheetStore),
        urlFetch,
      });

      return options.runWorker(dispatcher, request).finally(() => lockSession.releaseAll());
    },
  };
}
