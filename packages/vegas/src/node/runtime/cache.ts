import type { CacheHostScope } from "./cache-host-call";
import type { HostBridge } from "./host-bridge";

const DEFAULT_EXPIRATION_SECONDS = 600;
const MIN_EXPIRATION_SECONDS = 1;
const MAX_EXPIRATION_SECONDS = 21_600;
const MAX_KEY_CHARACTERS = 250;
const MAX_VALUE_BYTES = 100_000;

function validateExpiration(expirationInSeconds: number): void {
  if (
    !Number.isInteger(expirationInSeconds) ||
    expirationInSeconds < MIN_EXPIRATION_SECONDS ||
    expirationInSeconds > MAX_EXPIRATION_SECONDS
  ) {
    throw new RangeError("Local Cache expiration must be an integer from 1 to 21600 seconds.");
  }
}

function validateEntry(key: string, value: string): void {
  if (key.length > MAX_KEY_CHARACTERS) {
    throw new Error("Local Cache key exceeds the 250 character limit.");
  }

  if (new TextEncoder().encode(value).byteLength > MAX_VALUE_BYTES) {
    throw new Error("Local Cache value exceeds the 100 KB limit.");
  }
}

// https://developers.google.com/apps-script/reference/cache/cache
export class Cache {
  readonly #bridge: HostBridge;
  readonly #namespace: CacheHostScope;

  constructor(bridge: HostBridge, namespace: CacheHostScope) {
    this.#bridge = bridge;
    this.#namespace = namespace;
  }

  get(key: string): string | null {
    return this.#bridge.call({
      service: "cache",
      operation: "get",
      namespace: this.#namespace,
      key,
    });
  }

  getAll(keys: readonly string[]): Record<string, string> {
    return this.#bridge.call({
      service: "cache",
      operation: "getAll",
      namespace: this.#namespace,
      keys,
    });
  }

  put(key: string, value: string, expirationInSeconds = DEFAULT_EXPIRATION_SECONDS): void {
    validateExpiration(expirationInSeconds);
    validateEntry(key, value);

    this.#bridge.call({
      service: "cache",
      operation: "put",
      namespace: this.#namespace,
      key,
      value,
      expirationInSeconds,
    });
  }

  putAll(
    values: Readonly<Record<string, string>>,
    expirationInSeconds = DEFAULT_EXPIRATION_SECONDS,
  ): void {
    validateExpiration(expirationInSeconds);

    for (const [key, value] of Object.entries(values)) {
      validateEntry(key, value);
    }

    this.#bridge.call({
      service: "cache",
      operation: "putAll",
      namespace: this.#namespace,
      values,
      expirationInSeconds,
    });
  }

  remove(key: string): void {
    this.#bridge.call({
      service: "cache",
      operation: "remove",
      namespace: this.#namespace,
      key,
    });
  }

  removeAll(keys: readonly string[]): void {
    this.#bridge.call({
      service: "cache",
      operation: "removeAll",
      namespace: this.#namespace,
      keys,
    });
  }
}
