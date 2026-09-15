import crypto from "node:crypto";

type SessionState = "issued" | "claimed";

interface Session {
  readonly state: SessionState;
  readonly expiresAt: number;
}

interface WebAppSessionRegistryOptions {
  readonly createId?: () => string;
  readonly now?: () => number;
  readonly ttlMs?: number;
}

export class WebAppSessionRegistry {
  readonly #sessions = new Map<string, Session>();

  readonly #createId: () => string;
  readonly #now: () => number;
  readonly #ttlMs: number;

  constructor(options: WebAppSessionRegistryOptions = {}) {
    this.#createId = options.createId ?? crypto.randomUUID;
    this.#now = options.now ?? Date.now;
    this.#ttlMs = options.ttlMs ?? 30_000;
  }

  issue(): string {
    let id = "";

    do {
      id = this.#createId();
    } while (this.#sessions.has(id));

    this.#sessions.set(id, {
      state: "issued",
      expiresAt: this.#now() + this.#ttlMs,
    });

    return id;
  }

  claim(id: string): boolean {
    this.#deleteExpired();

    const session = this.#sessions.get(id);

    if (!session || session.state !== "issued") {
      return false;
    }

    this.#sessions.set(id, {
      ...session,
      state: "claimed",
    });

    return true;
  }

  consume(id: string): boolean {
    this.#deleteExpired();

    const session = this.#sessions.get(id);

    if (!session || session.state !== "claimed") {
      return false;
    }

    this.#sessions.delete(id);

    return true;
  }

  #deleteExpired(): void {
    const now = this.#now();

    for (const [id, session] of this.#sessions) {
      if (session.expiresAt <= now) {
        this.#sessions.delete(id);
      }
    }
  }
}
