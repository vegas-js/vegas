import { createGasEnum } from "../../globals/enum";
import type { CreateGasObject } from "../../globals/object";
import { createGasServiceObject } from "../../globals/serviceObject";
import { createBlobFacadeFactory, type BlobFacadeFactory } from "../base/blobFacade";
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

export function createUtilities(
  createObject?: CreateGasObject,
  injectedBlobFacadeFactory?: BlobFacadeFactory,
) {
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
  const blobFacadeFactory = injectedBlobFacadeFactory ?? createBlobFacadeFactory(createObject);

  const wrapBlobs = (blobs: GoogleAppsScript.Base.Blob[]): GoogleAppsScript.Base.Blob[] =>
    blobs.map((blob) => blobFacadeFactory.create(blob));

  return createGasServiceObject(
    {
      entries: [
        {
          name: "toString",
          value: () => "Utilities",
          writable: true,
        },
        {
          name: "Charset",
          value: charset,
          writable: false,
        },
        {
          name: "DigestAlgorithm",
          value: digestAlgorithm,
          writable: false,
        },
        {
          name: "MacAlgorithm",
          value: macAlgorithm,
          writable: false,
        },
        {
          name: "RsaAlgorithm",
          value: rsaAlgorithm,
          writable: false,
        },
        {
          name: "base64Decode",
          value: (encoded: string, charset?: GoogleAppsScript.Utilities.Charset) =>
            implementation.base64Decode(encoded, normalizeEnumOrdinal(charset)),
          writable: true,
        },
        {
          name: "base64DecodeWebSafe",
          value: (encoded: string, charset?: GoogleAppsScript.Utilities.Charset) =>
            implementation.base64DecodeWebSafe(encoded, normalizeEnumOrdinal(charset)),
          writable: true,
        },
        {
          name: "base64Encode",
          value: (
            data: string | GoogleAppsScript.Byte[],
            charset?: GoogleAppsScript.Utilities.Charset,
          ) => implementation.base64Encode(data, normalizeEnumOrdinal(charset)),
          writable: true,
        },
        {
          name: "base64EncodeWebSafe",
          value: (
            data: string | GoogleAppsScript.Byte[],
            charset?: GoogleAppsScript.Utilities.Charset,
          ) => implementation.base64EncodeWebSafe(data, normalizeEnumOrdinal(charset)),
          writable: true,
        },
        {
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
          writable: true,
        },
        {
          name: "computeHmacSha256Signature",
          value: (
            value: GoogleAppsScript.Byte[] | string,
            key: GoogleAppsScript.Byte[] | string,
            charset?: GoogleAppsScript.Utilities.Charset,
          ) => implementation.computeHmacSha256Signature(value, key, normalizeEnumOrdinal(charset)),
          writable: true,
        },
        {
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
          writable: true,
        },
        {
          name: "computeRsaSha1Signature",
          value: (value: string, key: string, charset?: GoogleAppsScript.Utilities.Charset) =>
            implementation.computeRsaSha1Signature(value, key, normalizeEnumOrdinal(charset)),
          writable: true,
        },
        {
          name: "computeRsaSha256Signature",
          value: (value: string, key: string, charset?: GoogleAppsScript.Utilities.Charset) =>
            implementation.computeRsaSha256Signature(value, key, normalizeEnumOrdinal(charset)),
          writable: true,
        },
        {
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
          writable: true,
        },
        {
          name: "formatDate",
          value: forward(implementation.formatDate),
          writable: true,
        },
        {
          name: "formatString",
          value: forward(implementation.formatString),
          writable: false,
        },
        {
          name: "getUuid",
          value: forward(implementation.getUuid),
          writable: true,
        },
        {
          name: "gzip",
          value: (blob: GoogleAppsScript.Base.BlobSource, name?: string) =>
            blobFacadeFactory.create(implementation.gzip(blobFacadeFactory.unwrap(blob), name)),
          writable: true,
        },
        {
          name: "jsonParse",
          value: forward(implementation.jsonParse),
          writable: true,
        },
        {
          name: "jsonStringify",
          value: forward(implementation.jsonStringify),
          writable: true,
        },
        {
          name: "newBlob",
          value: (data: GoogleAppsScript.Byte[] | string, contentType?: string, name?: string) =>
            blobFacadeFactory.create(implementation.newBlob(data, contentType, name)),
          writable: true,
        },
        {
          name: "parseCsv",
          value: forward(implementation.parseCsv),
          writable: true,
        },
        {
          name: "parseDate",
          value: forward(implementation.parseDate),
          writable: true,
        },
        {
          name: "sleep",
          value: forward(implementation.sleep),
          writable: true,
        },
        {
          name: "sleepAndThrow",
          value: unsupportedInternalUtilitiesMethod,
          writable: true,
        },
        {
          name: "ungzip",
          value: (blob: GoogleAppsScript.Base.BlobSource) =>
            blobFacadeFactory.create(implementation.ungzip(blobFacadeFactory.unwrap(blob))),
          writable: true,
        },
        {
          name: "unzip",
          value: (blob: GoogleAppsScript.Base.BlobSource) =>
            wrapBlobs(implementation.unzip(blobFacadeFactory.unwrap(blob))),
          writable: true,
        },
        {
          name: "validateSleepTime",
          value: unsupportedInternalUtilitiesMethod,
          writable: true,
        },
        {
          name: "zip",
          value: (blobs: GoogleAppsScript.Base.BlobSource[], name?: string) =>
            blobFacadeFactory.create(
              implementation.zip(
                blobs.map((blob) => blobFacadeFactory.unwrap(blob)),
                name,
              ),
            ),
          writable: true,
        },
      ],
    },
    createObject,
  );
}
