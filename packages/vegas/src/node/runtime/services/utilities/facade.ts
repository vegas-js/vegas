import { createGasEnum } from "../../globals/enum";
import type { CreateGasObject } from "../../globals/object";
import { createGasServiceObject } from "../../globals/serviceObject";
import { Utilities } from "./Utilities";

function normalizeEnumOrdinal<T>(value: T): T {
  if (value === null || typeof value !== "object") {
    return value;
  }

  const ordinal = (value as { ordinal?: unknown }).ordinal;
  if (typeof ordinal !== "function") {
    return value;
  }

  return Reflect.apply(ordinal, value, []) as T;
}

function forward<TArgs extends unknown[], TResult>(
  method: (...args: TArgs) => TResult,
): (...args: TArgs) => TResult {
  return (...args) => method(...args);
}

function unsupportedInternalUtilitiesMethod(): never {
  throw new Error("Function not implemented.");
}

export function createUtilities(createObject?: CreateGasObject) {
  const charset = createGasEnum(
    {
      members: ["US_ASCII", "UTF_8"],
      representative: "US_ASCII",
    },
    createObject,
  );

  const digestAlgorithm = createGasEnum(
    {
      members: ["MD2", "MD5", "SHA_1", "SHA_256", "SHA_384", "SHA_512"],
      representative: "SHA_512",
    },
    createObject,
  );

  const macAlgorithm = createGasEnum(
    {
      members: ["HMAC_MD5", "HMAC_SHA_1", "HMAC_SHA_256", "HMAC_SHA_384", "HMAC_SHA_512"],
      representative: "HMAC_SHA_512",
    },
    createObject,
  );

  const rsaAlgorithm = createGasEnum(
    {
      members: ["RSA_SHA_1", "RSA_SHA_256"],
      representative: "RSA_SHA_256",
    },
    createObject,
  );

  const implementation = new Utilities();

  return createGasServiceObject(
    {
      entries: [
        {
          kind: "method",
          name: "toString",
          value: () => "Utilities",
        },
        {
          kind: "property",
          name: "Charset",
          value: charset,
        },
        {
          kind: "property",
          name: "DigestAlgorithm",
          value: digestAlgorithm,
        },
        {
          kind: "property",
          name: "MacAlgorithm",
          value: macAlgorithm,
        },
        {
          kind: "property",
          name: "RsaAlgorithm",
          value: rsaAlgorithm,
        },
        {
          kind: "method",
          name: "base64Decode",
          value: (encoded: string, charset?: GoogleAppsScript.Utilities.Charset) =>
            implementation.base64Decode(encoded, normalizeEnumOrdinal(charset)),
        },
        {
          kind: "method",
          name: "base64DecodeWebSafe",
          value: (encoded: string, charset?: GoogleAppsScript.Utilities.Charset) =>
            implementation.base64DecodeWebSafe(encoded, normalizeEnumOrdinal(charset)),
        },
        {
          kind: "method",
          name: "base64Encode",
          value: (
            data: string | GoogleAppsScript.Byte[],
            charset?: GoogleAppsScript.Utilities.Charset,
          ) => implementation.base64Encode(data, normalizeEnumOrdinal(charset)),
        },
        {
          kind: "method",
          name: "base64EncodeWebSafe",
          value: (
            data: string | GoogleAppsScript.Byte[],
            charset?: GoogleAppsScript.Utilities.Charset,
          ) => implementation.base64EncodeWebSafe(data, normalizeEnumOrdinal(charset)),
        },
        {
          kind: "method",
          name: "computeDigest",
          value: (
            algorithm: GoogleAppsScript.Utilities.DigestAlgorithm,
            value: GoogleAppsScript.Byte[] | string,
            charset?: GoogleAppsScript.Utilities.Charset,
          ) =>
            implementation.computeDigest(
              normalizeEnumOrdinal(algorithm),
              value,
              normalizeEnumOrdinal(charset),
            ),
        },
        {
          kind: "method",
          name: "computeHmacSha256Signature",
          value: (
            value: GoogleAppsScript.Byte[] | string,
            key: GoogleAppsScript.Byte[] | string,
            charset?: GoogleAppsScript.Utilities.Charset,
          ) => implementation.computeHmacSha256Signature(value, key, normalizeEnumOrdinal(charset)),
        },
        {
          kind: "method",
          name: "computeHmacSignature",
          value: (
            algorithm: GoogleAppsScript.Utilities.MacAlgorithm,
            value: GoogleAppsScript.Byte[] | string,
            key: GoogleAppsScript.Byte[] | string,
            charset?: GoogleAppsScript.Utilities.Charset,
          ) =>
            implementation.computeHmacSignature(
              normalizeEnumOrdinal(algorithm),
              value,
              key,
              normalizeEnumOrdinal(charset),
            ),
        },
        {
          kind: "method",
          name: "computeRsaSha1Signature",
          value: (value: string, key: string, charset?: GoogleAppsScript.Utilities.Charset) =>
            implementation.computeRsaSha1Signature(value, key, normalizeEnumOrdinal(charset)),
        },
        {
          kind: "method",
          name: "computeRsaSha256Signature",
          value: (value: string, key: string, charset?: GoogleAppsScript.Utilities.Charset) =>
            implementation.computeRsaSha256Signature(value, key, normalizeEnumOrdinal(charset)),
        },
        {
          kind: "method",
          name: "computeRsaSignature",
          value: (
            algorithm: GoogleAppsScript.Utilities.RsaAlgorithm,
            value: string,
            key: string,
            charset?: GoogleAppsScript.Utilities.Charset,
          ) =>
            implementation.computeRsaSignature(
              normalizeEnumOrdinal(algorithm),
              value,
              key,
              normalizeEnumOrdinal(charset),
            ),
        },
        {
          kind: "method",
          name: "formatDate",
          value: forward(implementation.formatDate),
        },
        {
          kind: "property",
          name: "formatString",
          value: forward(implementation.formatString),
        },
        {
          kind: "method",
          name: "getUuid",
          value: forward(implementation.getUuid),
        },
        {
          kind: "method",
          name: "gzip",
          value: forward(implementation.gzip),
        },
        {
          kind: "method",
          name: "jsonParse",
          value: forward(implementation.jsonParse),
        },
        {
          kind: "method",
          name: "jsonStringify",
          value: forward(implementation.jsonStringify),
        },
        {
          kind: "method",
          name: "newBlob",
          value: forward(implementation.newBlob),
        },
        {
          kind: "method",
          name: "parseCsv",
          value: forward(implementation.parseCsv),
        },
        {
          kind: "method",
          name: "parseDate",
          value: forward(implementation.parseDate),
        },
        {
          kind: "method",
          name: "sleep",
          value: forward(implementation.sleep),
        },
        {
          kind: "method",
          name: "sleepAndThrow",
          value: unsupportedInternalUtilitiesMethod,
        },
        {
          kind: "method",
          name: "ungzip",
          value: forward(implementation.ungzip),
        },
        {
          kind: "method",
          name: "unzip",
          value: forward(implementation.unzip),
        },
        {
          kind: "method",
          name: "validateSleepTime",
          value: unsupportedInternalUtilitiesMethod,
        },
        {
          kind: "method",
          name: "zip",
          value: forward(implementation.zip),
        },
      ],
    },
    createObject,
  );
}
