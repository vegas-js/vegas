import type { CacheHostCallHandler } from "./cache-host-handler";
import type { DriveHostCallHandler } from "./drive-host-handler";
import type { HostCall, HostCallResult } from "./host-call";
import type { LockHostCallHandler } from "./lock-host-handler";
import type { PropertiesHostCallHandler } from "./properties-host-handler";
import type { UrlFetchHostCallHandler } from "./url-fetch-host-handler";

export interface HostCallDispatcher {
  dispatch<C extends HostCall>(call: C): Promise<HostCallResult<C>>;
}

export interface HostDispatcherOptions {
  readonly cache?: CacheHostCallHandler;
  readonly drive?: DriveHostCallHandler;
  readonly lock?: LockHostCallHandler;
  readonly properties: PropertiesHostCallHandler;
  readonly urlFetch?: UrlFetchHostCallHandler;
}

export class HostDispatcher implements HostCallDispatcher {
  readonly #cache: CacheHostCallHandler | undefined;
  readonly #drive: DriveHostCallHandler | undefined;
  readonly #lock: LockHostCallHandler | undefined;
  readonly #properties: PropertiesHostCallHandler;
  readonly #urlFetch: UrlFetchHostCallHandler | undefined;

  constructor(options: HostDispatcherOptions) {
    this.#cache = options.cache;
    this.#drive = options.drive;
    this.#lock = options.lock;
    this.#properties = options.properties;
    this.#urlFetch = options.urlFetch;
  }

  async dispatch<C extends HostCall>(call: C): Promise<HostCallResult<C>> {
    switch (call.service) {
      case "cache": {
        if (!this.#cache) {
          throw new Error("Cache host handler is not configured for this invocation.");
        }

        return (await this.#cache.handle(call)) as HostCallResult<C>;
      }
      case "drive": {
        if (!this.#drive) {
          throw new Error("Drive host handler is not configured for this invocation.");
        }

        return (await this.#drive.handle(call)) as HostCallResult<C>;
      }
      case "lock": {
        if (!this.#lock) {
          throw new Error("Lock host handler is not configured for this invocation.");
        }

        return (await this.#lock.handle(call)) as HostCallResult<C>;
      }
      case "properties": {
        return (await this.#properties.handle(call)) as HostCallResult<C>;
      }
      case "url-fetch": {
        if (!this.#urlFetch) {
          throw new Error("UrlFetch host handler is not configured for this invocation.");
        }

        return (await this.#urlFetch.handle(call)) as HostCallResult<C>;
      }
    }
  }
}
