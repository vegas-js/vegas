import type { BlobHostCallHandler } from "./blob-host-handler";
import type { CacheHostCallHandler } from "./cache-host-handler";
import type { DriveHostCallHandler } from "./drive-host-handler";
import type { HostCall, HostCallResult } from "./host-call";
import type { LockHostCallHandler } from "./lock-host-handler";
import type { PropertiesHostCallHandler } from "./properties-host-handler";
import { RuntimeInfrastructureError } from "./runtime-infrastructure-error";
import type { SpreadsheetHostCallHandler } from "./spreadsheet-host-handler";
import type { UrlFetchHostCallHandler } from "./url-fetch-host-handler";

export interface HostCallDispatcher {
  dispatch<C extends HostCall>(call: C): Promise<HostCallResult<C>>;
}

export interface HostDispatcherOptions {
  readonly blob?: BlobHostCallHandler;
  readonly cache?: CacheHostCallHandler;
  readonly drive?: DriveHostCallHandler;
  readonly lock?: LockHostCallHandler;
  readonly properties: PropertiesHostCallHandler;
  readonly spreadsheet?: SpreadsheetHostCallHandler;
  readonly urlFetch?: UrlFetchHostCallHandler;
}

export class HostDispatcher implements HostCallDispatcher {
  readonly #handlers: HostDispatcherOptions;

  constructor(options: HostDispatcherOptions) {
    this.#handlers = { ...options };
  }

  async dispatch<C extends HostCall>(call: C): Promise<HostCallResult<C>> {
    switch (call.service) {
      case "blob": {
        const handler = this.#handlers.blob;

        if (!handler) {
          throw new RuntimeInfrastructureError(
            "backend",
            "Blob host handler is not configured for this invocation.",
          );
        }

        return (await handler.handle(call)) as HostCallResult<C>;
      }
      case "cache": {
        const handler = this.#handlers.cache;

        if (!handler) {
          throw new RuntimeInfrastructureError(
            "backend",
            "Cache host handler is not configured for this invocation.",
          );
        }

        return (await handler.handle(call)) as HostCallResult<C>;
      }
      case "drive": {
        const handler = this.#handlers.drive;

        if (!handler) {
          throw new RuntimeInfrastructureError(
            "backend",
            "Drive host handler is not configured for this invocation.",
          );
        }

        return (await handler.handle(call)) as HostCallResult<C>;
      }
      case "lock": {
        const handler = this.#handlers.lock;

        if (!handler) {
          throw new RuntimeInfrastructureError(
            "backend",
            "Lock host handler is not configured for this invocation.",
          );
        }

        return (await handler.handle(call)) as HostCallResult<C>;
      }
      case "properties": {
        return (await this.#handlers.properties.handle(call)) as HostCallResult<C>;
      }
      case "spreadsheet": {
        const handler = this.#handlers.spreadsheet;

        if (!handler) {
          throw new RuntimeInfrastructureError(
            "backend",
            "Spreadsheet host handler is not configured for this invocation.",
          );
        }

        return (await handler.handle(call)) as HostCallResult<C>;
      }
      case "url-fetch": {
        const handler = this.#handlers.urlFetch;

        if (!handler) {
          throw new RuntimeInfrastructureError(
            "backend",
            "UrlFetch host handler is not configured for this invocation.",
          );
        }

        return (await handler.handle(call)) as HostCallResult<C>;
      }
    }
  }
}
