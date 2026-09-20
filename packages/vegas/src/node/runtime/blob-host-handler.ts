import type { BlobConversionCapability } from "./blob-conversion-capability";
import type { BlobHostCall, BlobHostCallResult } from "./blob-host-call";

export interface BlobHostCallHandler {
  handle(call: BlobHostCall): Promise<BlobHostCallResult<BlobHostCall>>;
}

export class BlobHostHandler implements BlobHostCallHandler {
  readonly #capability: BlobConversionCapability;

  constructor(capability: BlobConversionCapability) {
    this.#capability = capability;
  }

  async handle(call: BlobHostCall): Promise<BlobHostCallResult<BlobHostCall>> {
    return this.#capability.convert(call.value, call.contentType);
  }
}
