import { computeMd2 } from "./md2";
import type { UtilitiesCapability } from "./utilities-capability";
import {
  UTILITIES_DIGEST_ALGORITHM,
  UTILITIES_MAC_ALGORITHM,
  UTILITIES_RSA_ALGORITHM,
  type UtilitiesDigestAlgorithm,
  type UtilitiesMacAlgorithm,
  type UtilitiesRsaAlgorithm,
} from "./utilities-enum";

function toSignedBytes(data: Uint8Array): GoogleAppsScript.Byte[] {
  return Array.from(data, (value) => (value > 0x7f ? value - 0x100 : value));
}

export function computeUtilitiesDigest(
  capability: UtilitiesCapability,
  algorithm: UtilitiesDigestAlgorithm,
  data: Uint8Array,
): GoogleAppsScript.Byte[] {
  if (algorithm === UTILITIES_DIGEST_ALGORITHM.MD2) {
    return toSignedBytes(computeMd2(data));
  }

  let capabilityAlgorithm: "md5" | "sha1" | "sha256" | "sha384" | "sha512";
  switch (algorithm) {
    case UTILITIES_DIGEST_ALGORITHM.MD5:
      capabilityAlgorithm = "md5";
      break;
    case UTILITIES_DIGEST_ALGORITHM.SHA_1:
      capabilityAlgorithm = "sha1";
      break;
    case UTILITIES_DIGEST_ALGORITHM.SHA_256:
      capabilityAlgorithm = "sha256";
      break;
    case UTILITIES_DIGEST_ALGORITHM.SHA_384:
      capabilityAlgorithm = "sha384";
      break;
    case UTILITIES_DIGEST_ALGORITHM.SHA_512:
      capabilityAlgorithm = "sha512";
      break;
    default:
      throw new Error("Unsupported digest algorithm.");
  }

  return toSignedBytes(capability.computeDigest(capabilityAlgorithm, data));
}

export function computeUtilitiesHmac(
  capability: UtilitiesCapability,
  algorithm: UtilitiesMacAlgorithm,
  value: Uint8Array,
  key: Uint8Array,
): GoogleAppsScript.Byte[] {
  let capabilityAlgorithm: "md5" | "sha1" | "sha256" | "sha384" | "sha512";
  switch (algorithm) {
    case UTILITIES_MAC_ALGORITHM.HMAC_MD5:
      capabilityAlgorithm = "md5";
      break;
    case UTILITIES_MAC_ALGORITHM.HMAC_SHA_1:
      capabilityAlgorithm = "sha1";
      break;
    case UTILITIES_MAC_ALGORITHM.HMAC_SHA_256:
      capabilityAlgorithm = "sha256";
      break;
    case UTILITIES_MAC_ALGORITHM.HMAC_SHA_384:
      capabilityAlgorithm = "sha384";
      break;
    case UTILITIES_MAC_ALGORITHM.HMAC_SHA_512:
      capabilityAlgorithm = "sha512";
      break;
    default:
      throw new Error("Unsupported MAC algorithm.");
  }

  return toSignedBytes(capability.computeHmac(capabilityAlgorithm, value, key));
}

export function computeUtilitiesRsaSignature(
  capability: UtilitiesCapability,
  algorithm: UtilitiesRsaAlgorithm,
  value: Uint8Array,
  key: string,
): GoogleAppsScript.Byte[] {
  let capabilityAlgorithm: "sha1" | "sha256";
  switch (algorithm) {
    case UTILITIES_RSA_ALGORITHM.RSA_SHA_1:
      capabilityAlgorithm = "sha1";
      break;
    case UTILITIES_RSA_ALGORITHM.RSA_SHA_256:
      capabilityAlgorithm = "sha256";
      break;
    default:
      throw new Error("Unsupported RSA algorithm.");
  }

  return toSignedBytes(capability.computeRsaSignature(capabilityAlgorithm, value, key));
}
