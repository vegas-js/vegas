import type { BlobConversionCapability } from "../blob-conversion-capability";
import type { BlobValue } from "../blob-value";
import { UnsupportedRuntimeOperationError } from "../unsupported-runtime-operation-error";

// Apps Script documents the supported Blob conversion targets, but does not define the conversion
// algorithm. Node does not provide an equivalent document/image conversion service, so the default
// local Runtime fails closed instead of producing data that only approximates Apps Script output.
export class NodeBlobConversionCapability implements BlobConversionCapability {
  async convert(value: BlobValue, contentType: string): Promise<BlobValue> {
    throw new UnsupportedRuntimeOperationError(
      "Blob conversion",
      `Node cannot faithfully convert ${value.contentType ?? "unknown"} to ${contentType}.`,
    );
  }
}
