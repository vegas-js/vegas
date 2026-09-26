import type { BlobConversionCapability } from "./blob-conversion-capability";
import type { BlobHostCall, BlobHostCallResult } from "./blob-host-call";
import { unsupportedHostCall } from "./unsupported-host-call";

export interface BlobHostCallHandler {
  handle(call: BlobHostCall): Promise<BlobHostCallResult<BlobHostCall>>;
}

export class BlobHostHandler implements BlobHostCallHandler {
  readonly #capability: BlobConversionCapability;

  constructor(capability: BlobConversionCapability) {
    this.#capability = capability;
  }

  async handle(call: BlobHostCall): Promise<BlobHostCallResult<BlobHostCall>> {
    if (call.operation !== "convert") {
      // Blob currently has a single typed host operation, so TypeScript cannot narrow this
      // runtime protocol guard to never without crossing the typed HostCall contract.
      return unsupportedHostCall(call as never);
    }

    return this.#capability.convert(call.value, call.contentType);
  }
}
