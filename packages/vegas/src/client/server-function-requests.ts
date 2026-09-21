import type { ServerFunctionCallResponse } from "../shared/webapp-protocol";
import type { ServerFunctionHandlers } from "./server-function-run";

type UnhandledFailureReporter = (message: string) => void;
type TimeoutId = ReturnType<typeof globalThis.setTimeout>;

interface ServerFunctionRequestRegistryOptions {
  readonly reportUnhandledFailure?: UnhandledFailureReporter;
  readonly timeoutMs?: number;
  readonly timeoutMessage?: string;
}

interface PendingServerFunctionRequest {
  readonly handlers: ServerFunctionHandlers;
  readonly timeoutId?: TimeoutId;
}

export class ServerFunctionRequestRegistry {
  readonly #requests = new Map<number, PendingServerFunctionRequest>();
  readonly #reportUnhandledFailure: UnhandledFailureReporter;
  readonly #timeoutMs: number | undefined;
  readonly #timeoutMessage: string;

  #nextRequestId = 1;

  constructor(options: ServerFunctionRequestRegistryOptions = {}) {
    this.#reportUnhandledFailure = options.reportUnhandledFailure ?? console.error;
    this.#timeoutMs = options.timeoutMs;
    this.#timeoutMessage = options.timeoutMessage ?? "Vegas RPC request timed out.";
  }

  create(handlers: ServerFunctionHandlers): number {
    const requestId = this.#nextRequestId++;
    const timeoutId =
      this.#timeoutMs === undefined
        ? undefined
        : globalThis.setTimeout(() => {
            this.fail(requestId, this.#timeoutMessage);
          }, this.#timeoutMs);

    this.#requests.set(requestId, {
      handlers,
      timeoutId,
    });

    return requestId;
  }

  complete(response: ServerFunctionCallResponse): void {
    const request = this.#take(response.requestId);

    if (!request) {
      return;
    }

    if (response.status === "ok") {
      request.handlers.success?.(response.result);
      return;
    }

    this.#reportFailure(request.handlers, response.message);
  }

  fail(requestId: number, message: string): void {
    const request = this.#take(requestId);

    if (!request) {
      return;
    }

    this.#reportFailure(request.handlers, message);
  }

  failAll(message: string): void {
    const requests = [...this.#requests.values()];
    this.#requests.clear();

    for (const request of requests) {
      if (request.timeoutId !== undefined) {
        globalThis.clearTimeout(request.timeoutId);
      }

      this.#reportFailure(request.handlers, message);
    }
  }

  #take(requestId: number): PendingServerFunctionRequest | undefined {
    const request = this.#requests.get(requestId);

    if (!request) {
      return undefined;
    }

    this.#requests.delete(requestId);

    if (request.timeoutId !== undefined) {
      globalThis.clearTimeout(request.timeoutId);
    }

    return request;
  }

  #reportFailure(handlers: ServerFunctionHandlers, message: string): void {
    if (handlers.failure) {
      handlers.failure(message);
      return;
    }

    this.#reportUnhandledFailure(message);
  }
}
