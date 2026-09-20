import { createRuntimeEnum } from "./runtime-enum";

export const UTILITIES_CHARSET = createRuntimeEnum("US_ASCII", "UTF_8");
export type UtilitiesCharset = (typeof UTILITIES_CHARSET)[keyof typeof UTILITIES_CHARSET];

export const UTILITIES_DIGEST_ALGORITHM = createRuntimeEnum(
  "MD2",
  "MD5",
  "SHA_1",
  "SHA_256",
  "SHA_384",
  "SHA_512",
);
export type UtilitiesDigestAlgorithm =
  (typeof UTILITIES_DIGEST_ALGORITHM)[keyof typeof UTILITIES_DIGEST_ALGORITHM];

export const UTILITIES_MAC_ALGORITHM = createRuntimeEnum(
  "HMAC_MD5",
  "HMAC_SHA_1",
  "HMAC_SHA_256",
  "HMAC_SHA_384",
  "HMAC_SHA_512",
);
export type UtilitiesMacAlgorithm =
  (typeof UTILITIES_MAC_ALGORITHM)[keyof typeof UTILITIES_MAC_ALGORITHM];

export const UTILITIES_RSA_ALGORITHM = createRuntimeEnum("RSA_SHA_1", "RSA_SHA_256");
export type UtilitiesRsaAlgorithm =
  (typeof UTILITIES_RSA_ALGORITHM)[keyof typeof UTILITIES_RSA_ALGORITHM];
