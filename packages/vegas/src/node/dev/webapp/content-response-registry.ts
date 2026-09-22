import crypto from "node:crypto";

import type { TextOutputSnapshot } from "../../runtime";

interface ContentResponse {
  readonly expiresAt: number;
  readonly output: TextOutputSnapshot;
}

interface ContentResponseRegistryOptions {
  readonly createId?: () => string;
  readonly now?: () => number;
  readonly ttlMs?: number;
}

export class ContentResponseRegistry {
  readonly #responses = new Map<string, ContentResponse>();

  readonly #createId: () => string;
  readonly #now: () => number;
  readonly #ttlMs: number;

  constructor(options: ContentResponseRegistryOptions = {}) {
    this.#createId = options.createId ?? crypto.randomUUID;
    this.#now = options.now ?? Date.now;
    // Apps Script documents one-time ContentService URLs but not their lifetime.
    // Vegas uses 30 seconds only to bound Local Runtime resources.
    this.#ttlMs = options.ttlMs ?? 30_000;
  }

  issue(output: TextOutputSnapshot): string {
    this.#deleteExpired();

    let id = "";

    do {
      id = this.#createId();
    } while (this.#responses.has(id));

    this.#responses.set(id, {
      expiresAt: this.#now() + this.#ttlMs,
      output,
    });

    return id;
  }

  consume(id: string): TextOutputSnapshot | undefined {
    this.#deleteExpired();

    const response = this.#responses.get(id);

    if (response === undefined) {
      return undefined;
    }

    this.#responses.delete(id);

    return response.output;
  }

  #deleteExpired(): void {
    const now = this.#now();

    for (const [id, response] of this.#responses) {
      if (response.expiresAt <= now) {
        this.#responses.delete(id);
      }
    }
  }
}
