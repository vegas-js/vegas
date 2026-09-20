import { hydrateBlob, serializeBlob, type RuntimeBlob } from "./blob";
import type { BlobValue } from "./blob-value";
import type { HostBridge } from "./host-bridge";

export type BlobConverter = (value: BlobValue, contentType: string) => BlobValue;

export function createBlobConverter(hostBridge: HostBridge): BlobConverter {
  return (value, contentType) =>
    hostBridge.call({
      service: "blob",
      operation: "convert",
      value,
      contentType,
    });
}

export function convertBlob(
  blob: RuntimeBlob,
  contentType: string,
  convert: BlobConverter,
): RuntimeBlob {
  return hydrateBlob(convert(serializeBlob(blob), contentType));
}
