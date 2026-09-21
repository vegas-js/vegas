import type { ServerFunctionCallResponse } from "../shared/webapp-protocol";
import type { ServerFunctionHandlers } from "./server-function-run";

type UnhandledFailureReporter = (message: string) => void;

export class ServerFunctionRequestRegistry {
  readonly #requests = new Map<number, ServerFunctionHandlers>();
  readonly #reportUnhandledFailure: UnhandledFailureReporter;

  #nextRequestId = 1;

  constructor(reportUnhandledFailure: UnhandledFailureReporter = console.error) {
    this.#reportUnhandledFailure = reportUnhandledFailure;
  }

  create(handlers: ServerFunctionHandlers): number {
    const requestId = this.#nextRequestId++;
    this.#requests.set(requestId, handlers);

    return requestId;
  }

  complete(response: ServerFunctionCallResponse): void {
    const handlers = this.#requests.get(response.requestId);

    if (!handlers) {
      return;
    }

    this.#requests.delete(response.requestId);

    if (response.status === "ok") {
      handlers.success?.(response.result);
      return;
    }

    this.#reportFailure(handlers, response.message);
  }

  fail(requestId: number, message: string): void {
    const handlers = this.#requests.get(requestId);

    if (!handlers) {
      return;
    }

    this.#requests.delete(requestId);
    this.#reportFailure(handlers, message);
  }

  failAll(message: string): void {
    const requests = [...this.#requests.values()];
    this.#requests.clear();

    for (const handlers of requests) {
      this.#reportFailure(handlers, message);
    }
  }

  #reportFailure(handlers: ServerFunctionHandlers, message: string): void {
    if (handlers.failure) {
      handlers.failure(message);
      return;
    }

    this.#reportUnhandledFailure(message);
  }
}
