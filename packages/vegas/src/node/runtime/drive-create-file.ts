import { MIME_TYPE } from "./base-mime-type";
import { createBlob, type RuntimeBlob } from "./blob";

const MAX_PLAIN_TEXT_FILE_CONTENT_BYTES = 50_000_000;
const MAX_TYPED_FILE_CONTENT_BYTES = 10_000_000;

export function createDriveFileBlob(
  blobOrName: RuntimeBlob | string,
  content?: string,
  mimeType?: string,
): RuntimeBlob {
  if (typeof blobOrName !== "string") {
    return blobOrName;
  }

  if (content === undefined) {
    throw new TypeError("Drive file content is required.");
  }

  const bytes = new TextEncoder().encode(content);
  const maxBytes =
    mimeType === undefined ? MAX_PLAIN_TEXT_FILE_CONTENT_BYTES : MAX_TYPED_FILE_CONTENT_BYTES;

  if (bytes.byteLength > maxBytes) {
    throw new Error(`Local Drive file content exceeds the ${maxBytes / 1_000_000} MB limit.`);
  }

  return createBlob(Array.from(bytes), mimeType ?? MIME_TYPE.PLAIN_TEXT, blobOrName);
}
