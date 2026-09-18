const CHARSET = {
  US_ASCII: 0,
  UTF_8: 1,
} as const satisfies typeof GoogleAppsScript.Utilities.Charset;

const DIGEST_ALGORITHM = {
  MD2: 0,
  MD5: 1,
  SHA_1: 2,
  SHA_256: 3,
  SHA_384: 4,
  SHA_512: 5,
} as const satisfies typeof GoogleAppsScript.Utilities.DigestAlgorithm;

const MAC_ALGORITHM = {
  HMAC_MD5: 0,
  HMAC_SHA_1: 1,
  HMAC_SHA_256: 2,
  HMAC_SHA_384: 3,
  HMAC_SHA_512: 4,
} as const satisfies typeof GoogleAppsScript.Utilities.MacAlgorithm;

const RSA_ALGORITHM = {
  RSA_SHA_1: 0,
  RSA_SHA_256: 1,
} as const satisfies typeof GoogleAppsScript.Utilities.RsaAlgorithm;

// https://developers.google.com/apps-script/reference/utilities/utilities
// @types/google-apps-script models these values as ambient enums. Their concrete
// numeric values are Vegas-internal identities and are not compatibility promises.
export class Utilities {
  readonly Charset = CHARSET;
  readonly DigestAlgorithm = DIGEST_ALGORITHM;
  readonly MacAlgorithm = MAC_ALGORITHM;
  readonly RsaAlgorithm = RSA_ALGORITHM;
}

export function createUtilities(): Utilities {
  return new Utilities();
}
