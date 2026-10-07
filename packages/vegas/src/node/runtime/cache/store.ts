// https://developers.google.com/apps-script/reference/cache/cache-service
export type CacheNamespace =
  | {
      readonly kind: "script";
      readonly scriptKey: string;
    }
  | {
      readonly kind: "user";
      readonly scriptKey: string;
      readonly userKey: string;
    }
  | {
      readonly kind: "document";
      readonly scriptKey: string;
      readonly documentKey: string;
    };

// https://developers.google.com/apps-script/reference/cache/cache
export interface CacheStore {
  get(namespace: CacheNamespace, key: string): Promise<string | undefined>;

  getAll(namespace: CacheNamespace, keys: readonly string[]): Promise<Record<string, string>>;

  put(namespace: CacheNamespace, key: string, value: string, expiresAtMs: number): Promise<void>;

  putAll(
    namespace: CacheNamespace,
    values: Readonly<Record<string, string>>,
    expiresAtMs: number,
  ): Promise<void>;

  remove(namespace: CacheNamespace, key: string): Promise<void>;

  removeAll(namespace: CacheNamespace, keys: readonly string[]): Promise<void>;
}
