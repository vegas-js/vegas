import { unsupportedHostCall } from "./unsupported-host-call";
import type { UrlFetchCapability } from "./url-fetch-capability";
import type { UrlFetchHostCall, UrlFetchHostCallResult } from "./url-fetch-host-call";

export interface UrlFetchHostCallHandler {
  handle(call: UrlFetchHostCall): Promise<UrlFetchHostCallResult<UrlFetchHostCall>>;
}

export class UrlFetchHostHandler implements UrlFetchHostCallHandler {
  readonly #capability: UrlFetchCapability;
  readonly #signal: AbortSignal | undefined;

  constructor(capability: UrlFetchCapability, signal?: AbortSignal) {
    this.#capability = capability;
    this.#signal = signal;
  }

  async handle(call: UrlFetchHostCall): Promise<UrlFetchHostCallResult<UrlFetchHostCall>> {
    switch (call.operation) {
      case "fetch": {
        return this.#capability.fetch(call.request, this.#signal);
      }
      case "fetch-all": {
        return this.#capability.fetchAll(call.requests, this.#signal);
      }
    }

    return unsupportedHostCall(call);
  }
}
