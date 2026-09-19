import { Cache } from "./cache";
import type { HostBridge } from "./host-bridge";

// https://developers.google.com/apps-script/reference/cache/cache-service
export class CacheService {
  readonly #bridge: HostBridge;
  readonly #documentCache: Cache;
  readonly #scriptCache: Cache;
  readonly #userCache: Cache;

  constructor(bridge: HostBridge) {
    this.#bridge = bridge;
    this.#documentCache = new Cache(bridge, "document");
    this.#scriptCache = new Cache(bridge, "script");
    this.#userCache = new Cache(bridge, "user");
  }

  getDocumentCache(): Cache | null {
    const isAvailable = this.#bridge.call({
      service: "cache",
      operation: "isAvailable",
      namespace: "document",
    });

    return isAvailable ? this.#documentCache : null;
  }

  getScriptCache(): Cache {
    return this.#scriptCache;
  }

  getUserCache(): Cache {
    return this.#userCache;
  }
}

export function createCacheService(bridge: HostBridge): CacheService {
  return new CacheService(bridge);
}
