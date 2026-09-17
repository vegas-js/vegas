export type CacheHostScope = "document" | "script" | "user";

export type CacheHostCall =
  | {
      readonly service: "cache";
      readonly operation: "isAvailable";
      readonly namespace: CacheHostScope;
    }
  | {
      readonly service: "cache";
      readonly operation: "get";
      readonly namespace: CacheHostScope;
      readonly key: string;
    }
  | {
      readonly service: "cache";
      readonly operation: "getAll";
      readonly namespace: CacheHostScope;
      readonly keys: readonly string[];
    }
  | {
      readonly service: "cache";
      readonly operation: "put";
      readonly namespace: CacheHostScope;
      readonly key: string;
      readonly value: string;
      readonly expirationInSeconds: number;
    }
  | {
      readonly service: "cache";
      readonly operation: "putAll";
      readonly namespace: CacheHostScope;
      readonly values: Readonly<Record<string, string>>;
      readonly expirationInSeconds: number;
    }
  | {
      readonly service: "cache";
      readonly operation: "remove";
      readonly namespace: CacheHostScope;
      readonly key: string;
    }
  | {
      readonly service: "cache";
      readonly operation: "removeAll";
      readonly namespace: CacheHostScope;
      readonly keys: readonly string[];
    };

export type CacheHostCallResult<C extends CacheHostCall> = C extends {
  readonly operation: "isAvailable";
}
  ? boolean
  : C extends {
        readonly operation: "get";
      }
    ? string | null
    : C extends {
          readonly operation: "getAll";
        }
      ? Record<string, string>
      : void;
