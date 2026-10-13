import {
  cloneDriveIteratorContinuationState,
  InMemoryDriveIteratorSession,
  type DriveIteratorContinuationState,
} from "./in-memory-iterator-session";
import type { DriveIteratorSession, DriveIteratorStore } from "./iterator-store";
import type { DriveNamespace } from "./store";

// Google describes continuation tokens as generally valid for one week.
// Vegas local emulation uses exactly seven days; Google expiry timing is not guaranteed.
const LOCAL_CONTINUATION_TTL_MS = 7 * 24 * 60 * 60 * 1_000;

type StoredContinuation = {
  readonly namespace: DriveNamespace;
  readonly state: DriveIteratorContinuationState;
  readonly expiresAtMs: number;
};

export class InMemoryDriveIteratorStore implements DriveIteratorStore {
  readonly #now: () => number;
  readonly #continuations = new Map<string, StoredContinuation>();
  #nextSessionId = 0;

  constructor(now: () => number = Date.now) {
    this.#now = now;
  }

  createSession(namespace: DriveNamespace): DriveIteratorSession {
    this.#nextSessionId += 1;

    return new InMemoryDriveIteratorSession(
      this.#nextSessionId,
      namespace,
      (sessionNamespace, state) => this.#saveContinuation(sessionNamespace, state),
      (sessionNamespace, token) => this.#loadContinuation(sessionNamespace, token),
    );
  }

  #saveContinuation(namespace: DriveNamespace, state: DriveIteratorContinuationState): string {
    const nowMs = this.#now();
    this.#discardExpiredContinuations(nowMs);
    // Vegas local emulation: Google does not specify a continuation token format.
    // Use unpredictable tokens so recreating this store cannot revive an old
    // token as an unrelated iterator belonging to the same Drive user.
    const token = `drive-continuation:${crypto.randomUUID()}`;

    this.#continuations.set(token, {
      namespace: { ...namespace },
      state: cloneDriveIteratorContinuationState(state),
      expiresAtMs: nowMs + LOCAL_CONTINUATION_TTL_MS,
    });
    return token;
  }

  #loadContinuation(namespace: DriveNamespace, token: string): DriveIteratorContinuationState {
    this.#discardExpiredContinuations(this.#now());
    const continuation = this.#continuations.get(token);

    if (!continuation) {
      throw new Error(`Unknown Drive continuation token: ${token}`);
    }

    if (continuation.namespace.userKey !== namespace.userKey) {
      throw new Error("Drive continuation token is not available in this Drive namespace.");
    }

    return cloneDriveIteratorContinuationState(continuation.state);
  }

  #discardExpiredContinuations(nowMs: number): void {
    for (const [token, continuation] of this.#continuations) {
      if (continuation.expiresAtMs <= nowMs) {
        this.#continuations.delete(token);
      }
    }
  }
}
