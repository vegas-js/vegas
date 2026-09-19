import { computeMd2 } from "./md2";
import type { UtilitiesCapability } from "./utilities-capability";

export const DIGEST_ALGORITHM = {
  MD2: 0,
  MD5: 1,
  SHA_1: 2,
  SHA_256: 3,
  SHA_384: 4,
  SHA_512: 5,
} as const satisfies typeof GoogleAppsScript.Utilities.DigestAlgorithm;

export const MAC_ALGORITHM = {
  HMAC_MD5: 0,
  HMAC_SHA_1: 1,
  HMAC_SHA_256: 2,
  HMAC_SHA_384: 3,
  HMAC_SHA_512: 4,
} as const satisfies typeof GoogleAppsScript.Utilities.MacAlgorithm;

export const RSA_ALGORITHM = {
  RSA_SHA_1: 0,
  RSA_SHA_256: 1,
} as const satisfies typeof GoogleAppsScript.Utilities.RsaAlgorithm;

function toSignedBytes(data: Uint8Array): GoogleAppsScript.Byte[] {
  return Array.from(data, (value) => (value > 0x7f ? value - 0x100 : value));
}

export function computeUtilitiesDigest(
  capability: UtilitiesCapability,
  algorithm: GoogleAppsScript.Utilities.DigestAlgorithm,
  data: Uint8Array,
): GoogleAppsScript.Byte[] {
  if (algorithm === DIGEST_ALGORITHM.MD2) {
    return toSignedBytes(computeMd2(data));
  }

  let capabilityAlgorithm: "md5" | "sha1" | "sha256" | "sha384" | "sha512";
  switch (algorithm) {
    case DIGEST_ALGORITHM.MD5:
      capabilityAlgorithm = "md5";
      break;
    case DIGEST_ALGORITHM.SHA_1:
      capabilityAlgorithm = "sha1";
      break;
    case DIGEST_ALGORITHM.SHA_256:
      capabilityAlgorithm = "sha256";
      break;
    case DIGEST_ALGORITHM.SHA_384:
      capabilityAlgorithm = "sha384";
      break;
    case DIGEST_ALGORITHM.SHA_512:
      capabilityAlgorithm = "sha512";
      break;
    default:
      throw new Error("Unsupported digest algorithm.");
  }

  return toSignedBytes(capability.computeDigest(capabilityAlgorithm, data));
}

export function computeUtilitiesHmac(
  capability: UtilitiesCapability,
  algorithm: GoogleAppsScript.Utilities.MacAlgorithm,
  value: Uint8Array,
  key: Uint8Array,
): GoogleAppsScript.Byte[] {
  let capabilityAlgorithm: "md5" | "sha1" | "sha256" | "sha384" | "sha512";
  switch (algorithm) {
    case MAC_ALGORITHM.HMAC_MD5:
      capabilityAlgorithm = "md5";
      break;
    case MAC_ALGORITHM.HMAC_SHA_1:
      capabilityAlgorithm = "sha1";
      break;
    case MAC_ALGORITHM.HMAC_SHA_256:
      capabilityAlgorithm = "sha256";
      break;
    case MAC_ALGORITHM.HMAC_SHA_384:
      capabilityAlgorithm = "sha384";
      break;
    case MAC_ALGORITHM.HMAC_SHA_512:
      capabilityAlgorithm = "sha512";
      break;
    default:
      throw new Error("Unsupported MAC algorithm.");
  }

  return toSignedBytes(capability.computeHmac(capabilityAlgorithm, value, key));
}

export function computeUtilitiesRsaSignature(
  capability: UtilitiesCapability,
  algorithm: GoogleAppsScript.Utilities.RsaAlgorithm,
  value: Uint8Array,
  key: string,
): GoogleAppsScript.Byte[] {
  let capabilityAlgorithm: "sha1" | "sha256";
  switch (algorithm) {
    case RSA_ALGORITHM.RSA_SHA_1:
      capabilityAlgorithm = "sha1";
      break;
    case RSA_ALGORITHM.RSA_SHA_256:
      capabilityAlgorithm = "sha256";
      break;
    default:
      throw new Error("Unsupported RSA algorithm.");
  }

  return toSignedBytes(capability.computeRsaSignature(capabilityAlgorithm, value, key));
}
