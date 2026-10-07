export type LockNamespace =
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

/**
 * Represents one invocation's ownership of locks in a shared LockStore.
 * The owner identity is intentionally opaque outside the Store.
 */
export interface LockStoreSession {
  acquire(namespace: LockNamespace, timeoutInMillis: number): Promise<boolean>;
  has(namespace: LockNamespace): Promise<boolean>;
  release(namespace: LockNamespace): Promise<void>;
  releaseAll(): Promise<void>;
}

/**
 * Owns lock contention across invocations and creates invocation-local
 * ownership sessions.
 */
export interface LockStore {
  createSession(): LockStoreSession;
}
