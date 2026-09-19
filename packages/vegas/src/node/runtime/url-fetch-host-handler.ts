import { unsupportedHostCall } from "./unsupported-host-call";
import type { UrlFetchCapability } from "./url-fetch-capability";
import type { UrlFetchHostCall, UrlFetchHostCallResult } from "./url-fetch-host-call";

export interface UrlFetchHostCallHandler {
  handle(call: UrlFetchHostCall): Promise<UrlFetchHostCallResult<UrlFetchHostCall>>;
}

export class UrlFetchHostHandler implements UrlFetchHostCallHandler {
  readonly #capability: UrlFetchCapability;

  constructor(capability: UrlFetchCapability) {
    this.#capability = capability;
  }

  async handle(call: UrlFetchHostCall): Promise<UrlFetchHostCallResult<UrlFetchHostCall>> {
    switch (call.operation) {
      case "fetch": {
        return this.#capability.fetch(call.request);
      }
      case "fetch-all": {
        return this.#capability.fetchAll(call.requests);
      }
    }

    return unsupportedHostCall(call);
  }
}
