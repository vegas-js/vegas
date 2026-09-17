import type { LockNamespace, LockStore, LockStoreSession } from "./lock-store";

type LockWaiter = {
  readonly sessionId: number;
  readonly resolve: (acquired: boolean) => void;
  timer: ReturnType<typeof setTimeout> | undefined;
};

type LockState = {
  ownerSessionId: number | undefined;
  readonly waiters: LockWaiter[];
};

function createNamespaceKey(namespace: LockNamespace): string {
  switch (namespace.kind) {
    case "script": {
      return JSON.stringify(["script", namespace.scriptKey]);
    }
    case "user": {
      return JSON.stringify(["user", namespace.scriptKey, namespace.userKey]);
    }
    case "document": {
      return JSON.stringify(["document", namespace.scriptKey, namespace.documentKey]);
    }
  }
}

export class InMemoryLockStore implements LockStore {
  readonly #locks = new Map<string, LockState>();
  readonly #heldKeysBySession = new Map<number, Set<string>>();
  #nextSessionId = 0;

  createSession(): LockStoreSession {
    this.#nextSessionId += 1;
    const sessionId = this.#nextSessionId;

    return {
      acquire: (namespace, timeoutInMillis) => this.#acquire(sessionId, namespace, timeoutInMillis),
      has: (namespace) => Promise.resolve(this.#has(sessionId, namespace)),
      release: (namespace) => {
        this.#release(sessionId, namespace);
        return Promise.resolve();
      },
      releaseAll: () => {
        this.#releaseAll(sessionId);
        return Promise.resolve();
      },
    };
  }

  #acquire(sessionId: number, namespace: LockNamespace, timeoutInMillis: number): Promise<boolean> {
    const key = createNamespaceKey(namespace);
    const state = this.#getOrCreateState(key);

    if (state.ownerSessionId === sessionId) {
      return Promise.resolve(true);
    }

    if (state.ownerSessionId === undefined) {
      this.#grant(key, state, sessionId);
      return Promise.resolve(true);
    }

    if (timeoutInMillis <= 0) {
      return Promise.resolve(false);
    }

    return new Promise((resolve) => {
      const waiter: LockWaiter = {
        sessionId,
        resolve,
        timer: undefined,
      };

      state.waiters.push(waiter);
      waiter.timer = setTimeout(() => {
        this.#timeOut(key, state, waiter);
      }, timeoutInMillis);
    });
  }

  #has(sessionId: number, namespace: LockNamespace): boolean {
    return this.#locks.get(createNamespaceKey(namespace))?.ownerSessionId === sessionId;
  }

  #release(sessionId: number, namespace: LockNamespace): void {
    this.#releaseKey(sessionId, createNamespaceKey(namespace));
  }

  #releaseAll(sessionId: number): void {
    for (const [key, state] of this.#locks) {
      for (let index = state.waiters.length - 1; index >= 0; index -= 1) {
        const waiter = state.waiters[index];
        if (waiter.sessionId !== sessionId) {
          continue;
        }

        state.waiters.splice(index, 1);
        if (waiter.timer !== undefined) {
          clearTimeout(waiter.timer);
        }
        waiter.resolve(false);
      }

      this.#deleteStateIfUnused(key, state);
    }

    const heldKeys = [...(this.#heldKeysBySession.get(sessionId) ?? [])];
    for (const key of heldKeys) {
      this.#releaseKey(sessionId, key);
    }

    this.#heldKeysBySession.delete(sessionId);
  }

  #releaseKey(sessionId: number, key: string): void {
    const state = this.#locks.get(key);
    if (!state || state.ownerSessionId !== sessionId) {
      return;
    }

    state.ownerSessionId = undefined;
    this.#heldKeysBySession.get(sessionId)?.delete(key);
    this.#grantNext(key, state);
    this.#deleteStateIfUnused(key, state);
  }

  #grantNext(key: string, state: LockState): void {
    const waiter = state.waiters.shift();
    if (!waiter) {
      return;
    }

    if (waiter.timer !== undefined) {
      clearTimeout(waiter.timer);
    }

    this.#grant(key, state, waiter.sessionId);
    waiter.resolve(true);
  }

  #grant(key: string, state: LockState, sessionId: number): void {
    state.ownerSessionId = sessionId;

    let heldKeys = this.#heldKeysBySession.get(sessionId);
    if (!heldKeys) {
      heldKeys = new Set();
      this.#heldKeysBySession.set(sessionId, heldKeys);
    }
    heldKeys.add(key);
  }

  #timeOut(key: string, state: LockState, waiter: LockWaiter): void {
    const index = state.waiters.indexOf(waiter);
    if (index < 0) {
      return;
    }

    state.waiters.splice(index, 1);
    waiter.timer = undefined;
    waiter.resolve(false);
    this.#deleteStateIfUnused(key, state);
  }

  #getOrCreateState(key: string): LockState {
    let state = this.#locks.get(key);
    if (!state) {
      state = {
        ownerSessionId: undefined,
        waiters: [],
      };
      this.#locks.set(key, state);
    }
    return state;
  }

  #deleteStateIfUnused(key: string, state: LockState): void {
    if (state.ownerSessionId === undefined && state.waiters.length === 0) {
      this.#locks.delete(key);
    }
  }
}
