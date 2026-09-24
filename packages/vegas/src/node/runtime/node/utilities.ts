import crypto from "node:crypto";
import zlib from "node:zlib";

import type { BlobConverter } from "../blob-converter";
import { createUtilities } from "../utilities";
import type { UtilitiesArchiveEntry, UtilitiesCapability } from "../utilities-capability";
import { createZip, extractZip } from "./zip";

const SLEEP_ARRAY = new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT));

export class NodeUtilitiesCapability implements UtilitiesCapability {
  encodeString(value: string, encoding: "ascii" | "utf8"): Uint8Array {
    return Buffer.from(value, encoding);
  }

  encodeBase64(data: Uint8Array): string {
    return Buffer.from(data).toString("base64");
  }

  decodeBase64(value: string): Uint8Array {
    return Buffer.from(value, "base64");
  }

  computeDigest(
    algorithm: "md5" | "sha1" | "sha256" | "sha384" | "sha512",
    data: Uint8Array,
  ): Uint8Array {
    return crypto.createHash(algorithm).update(data).digest();
  }

  computeHmac(
    algorithm: "md5" | "sha1" | "sha256" | "sha384" | "sha512",
    value: Uint8Array,
    key: Uint8Array,
  ): Uint8Array {
    return crypto.createHmac(algorithm, key).update(value).digest();
  }

  computeRsaSignature(algorithm: "sha1" | "sha256", value: Uint8Array, key: string): Uint8Array {
    // Google public documentation does not specify the RSA padding scheme.
    // Vegas uses RSASSA-PKCS1-v1_5 as its explicit local Runtime contract.
    return crypto.sign(algorithm, value, {
      key,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    });
  }

  randomUuid(): string {
    return crypto.randomUUID();
  }

  sleep(milliseconds: number): void {
    Atomics.wait(SLEEP_ARRAY, 0, 0, milliseconds);
  }

  gzip(data: Uint8Array): Uint8Array {
    return zlib.gzipSync(data);
  }

  gunzip(data: Uint8Array): Uint8Array {
    return zlib.gunzipSync(data);
  }

  zip(entries: readonly UtilitiesArchiveEntry[]): Uint8Array {
    return createZip(entries);
  }

  unzip(data: Uint8Array): readonly UtilitiesArchiveEntry[] {
    return extractZip(data);
  }
}

export function createNodeUtilities(blobConverter?: BlobConverter) {
  return createUtilities(new NodeUtilitiesCapability(), blobConverter);
}
