import type { DriveIteratorSession, DriveIteratorStore } from "./drive-iterator-store";
import type { DriveNamespace } from "./drive-store";
import {
  cloneDriveIteratorContinuationState,
  InMemoryDriveIteratorSession,
  type DriveIteratorContinuationState,
} from "./in-memory-drive-iterator-session";

type StoredContinuation = {
  readonly namespace: DriveNamespace;
  readonly state: DriveIteratorContinuationState;
};

export class InMemoryDriveIteratorStore implements DriveIteratorStore {
  readonly #continuations = new Map<string, StoredContinuation>();
  #nextSessionId = 0;
  #nextTokenId = 0;

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
    this.#nextTokenId += 1;
    const token = `drive-continuation:${this.#nextTokenId}`;

    this.#continuations.set(token, {
      namespace: { ...namespace },
      state: cloneDriveIteratorContinuationState(state),
    });
    return token;
  }

  #loadContinuation(namespace: DriveNamespace, token: string): DriveIteratorContinuationState {
    const continuation = this.#continuations.get(token);

    if (!continuation) {
      throw new Error(`Unknown Drive continuation token: ${token}`);
    }

    if (continuation.namespace.userKey !== namespace.userKey) {
      throw new Error("Drive continuation token is not available in this Drive namespace.");
    }

    return cloneDriveIteratorContinuationState(continuation.state);
  }
}
