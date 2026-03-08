import crypto from "node:crypto";
import zlib from "node:zlib";

import { Blob } from "../base/Blob";
import { MD2Hash } from "./md2hash";

// https://developers.google.com/apps-script/reference/utilities/utilities
export class Utilities implements GoogleAppsScript.Utilities.Utilities {
  Charset = {
    US_ASCII: 0,
    UTF_8: 1,
  };
  DigestAlgorithm = {
    MD2: 0,
    MD5: 1,
    SHA_1: 2,
    SHA_256: 3,
    SHA_384: 4,
    SHA_512: 5,
  };
  #DigestAlgorithmMap = {
    [this.DigestAlgorithm.MD2]: "md2",
    [this.DigestAlgorithm.MD5]: "md5",
    [this.DigestAlgorithm.SHA_1]: "sha1",
    [this.DigestAlgorithm.SHA_256]: "sha256",
    [this.DigestAlgorithm.SHA_384]: "sha384",
    [this.DigestAlgorithm.SHA_512]: "sha512",
  } as const;
  MacAlgorithm = {
    HMAC_MD5: 0,
    HMAC_SHA_1: 1,
    HMAC_SHA_256: 2,
    HMAC_SHA_384: 3,
    HMAC_SHA_512: 4,
  };
  #MacAlgorithmMap = {
    [this.MacAlgorithm.HMAC_MD5]: "md5",
    [this.MacAlgorithm.HMAC_SHA_1]: "sha1",
    [this.MacAlgorithm.HMAC_SHA_256]: "sha256",
    [this.MacAlgorithm.HMAC_SHA_384]: "sha384",
    [this.MacAlgorithm.HMAC_SHA_512]: "sha512",
  } as const;
  RsaAlgorithm = {
    RSA_SHA_1: 0,
    RSA_SHA_256: 1,
  };
  #RsaAlgorithmMap = {
    [this.RsaAlgorithm.RSA_SHA_1]: "sha1",
    [this.RsaAlgorithm.RSA_SHA_256]: "sha256",
  } as const;

  // oxlint-disable-next-line no-unused-vars
  base64Decode = (encoded: string, charset?: GoogleAppsScript.Utilities.Charset) => {
    return Array.from(new Int8Array(Buffer.from(encoded, "base64")));
  };
  base64DecodeWebSafe = (encoded: string, charset?: GoogleAppsScript.Utilities.Charset) => {
    return this.base64Decode(encoded, charset);
  };
  base64Encode = (
    data: string | GoogleAppsScript.Byte[],
    charset?: GoogleAppsScript.Utilities.Charset,
  ) => {
    const encoding = (charset && charset === 0 ? "ascii" : "utf8") as BufferEncoding;
    const buffer = typeof data === "string" ? Buffer.from(data, encoding) : Buffer.from(data);
    return buffer.toString("base64");
  };
  base64EncodeWebSafe = (
    data: string | GoogleAppsScript.Byte[],
    charset?: GoogleAppsScript.Utilities.Charset,
  ) => {
    return this.base64Encode(data, charset).replaceAll("+", "-").replaceAll("/", "_");
  };
  computeDigest = (
    algorithm: GoogleAppsScript.Utilities.DigestAlgorithm,
    value: GoogleAppsScript.Byte[] | string,
    charset?: GoogleAppsScript.Utilities.Charset,
  ) => {
    let algo = this.#DigestAlgorithmMap[algorithm];

    const encoding = (charset && charset === 0 ? "ascii" : "utf8") as BufferEncoding;
    const buffer = typeof value === "string" ? Buffer.from(value, encoding) : Buffer.from(value);
    const hash = algo === "md2" ? new MD2Hash() : crypto.createHash(algo);
    hash.update(buffer);
    const result = Array.from(new Int8Array(hash.digest()));

    return result;
  };
  computeHmacSha256Signature = (
    value: GoogleAppsScript.Byte[] | string,
    key: GoogleAppsScript.Byte[] | string,
    charset?: GoogleAppsScript.Utilities.Charset,
  ) => {
    return this.computeHmacSignature(this.MacAlgorithm.HMAC_SHA_256, value, key, charset);
  };
  computeHmacSignature = (
    algorithm: GoogleAppsScript.Utilities.MacAlgorithm,
    value: GoogleAppsScript.Byte[] | string,
    key: GoogleAppsScript.Byte[] | string,
    charset?: GoogleAppsScript.Utilities.Charset,
  ) => {
    let algo = this.#MacAlgorithmMap[algorithm];

    const encoding = (charset && charset === 0 ? "ascii" : "utf8") as BufferEncoding;
    const bufferValue =
      typeof value === "string" ? Buffer.from(value, encoding) : Buffer.from(value);
    const bufferKey = typeof key === "string" ? Buffer.from(key, encoding) : Buffer.from(key);
    const hmac = crypto.createHmac(algo, bufferKey);
    hmac.update(bufferValue);
    const result = Array.from(new Int8Array(hmac.digest()));

    return result;
  };
  computeRsaSha1Signature = (
    value: string,
    key: string,
    charset?: GoogleAppsScript.Utilities.Charset,
  ) => {
    return this.computeRsaSignature(this.RsaAlgorithm.RSA_SHA_1, value, key, charset);
  };
  computeRsaSha256Signature = (
    value: string,
    key: string,
    charset?: GoogleAppsScript.Utilities.Charset,
  ) => {
    return this.computeRsaSignature(this.RsaAlgorithm.RSA_SHA_256, value, key, charset);
  };
  computeRsaSignature = (
    algorithm: GoogleAppsScript.Utilities.RsaAlgorithm,
    value: string,
    key: string,
    charset?: GoogleAppsScript.Utilities.Charset,
  ) => {
    let algo = this.#RsaAlgorithmMap[algorithm];

    const encoding = (charset && charset === 0 ? "ascii" : "utf8") as BufferEncoding;
    const bufferValue =
      typeof value === "string" ? Buffer.from(value, encoding) : Buffer.from(value);
    const bufferKey = typeof key === "string" ? Buffer.from(key, encoding) : Buffer.from(key);
    const result = Array.from(new Int8Array(crypto.sign(algo, bufferValue, bufferKey)));

    return result;
  };
  formatDate = (date: GoogleAppsScript.Base.Date, timeZone: string, format: string) => {
    const formatter = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      era: "short",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      fractionalSecondDigits: 3,
      timeZoneName: "longGeneric",
      hour12: true,
      timeZone: timeZone,
    });
    const parts: Record<string, string> = {};
    formatter.formatToParts(date.valueOf()).forEach((part) => {
      if (part.type !== "literal") {
        parts[part.type] = part.value;
      }
    });
    // https://docs.oracle.com/javase/7/docs/api/java/text/SimpleDateFormat.html
    let target = "";
    let start = 0;
    const str: string[] = [];
    const weekDayMap: Record<string, number> = {
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
      Sunday: 7,
    };
    const tzDate = new globalThis.Date(
      (date as globalThis.Date).toLocaleDateString("en-US", { timeZone }),
    );
    const utcDate = new globalThis.Date(
      (date as globalThis.Date).toLocaleDateString("en-US", { timeZone: "UTC" }),
    );
    const offsetTotalMin = Math.round((tzDate.getTime() - utcDate.getTime()) / 60000);
    for (let i = 0; i <= format.length; i++) {
      const ch = i !== format.length ? format.charAt(i) : "";
      const isFormatChar = /^[GyYMwWDdFEuaHkKhmsSzZX]$/.test(ch);
      if (target || isFormatChar) {
        if (target) {
          if (target !== ch) {
            const length = i - start;
            switch (target) {
              case "G": {
                str.push(parts.era);
                break;
              }
              case "y":
              case "Y": {
                str.push(length === 2 ? parts.year.slice(2, 4) : parts.year.padStart(length, "0"));
                break;
              }
              case "M": {
                const MonthString: string[] = [
                  "January",
                  "February",
                  "March",
                  "April",
                  "May",
                  "June",
                  "July",
                  "August",
                  "September",
                  "October",
                  "November",
                  "December",
                ];
                str.push(
                  length <= 2
                    ? parts.month.padStart(length, "0")
                    : length === 3
                      ? MonthString[Number(parts.month) - 1].slice(0, 3)
                      : MonthString[Number(parts.month) - 1],
                );
                break;
              }
              case "w": {
                const firstDayOfYear = new Date(`${parts.year}-01-01T00:00:00Z`);
                const weekNumber = weekDayMap[parts.weekday];
                const diff = date.getTime() - firstDayOfYear.getTime();
                const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
                const offset = dayOfYear % 7;
                const tmpWeekNumber = weekNumber - offset;
                const firstWeekNumber = tmpWeekNumber <= 0 ? 7 - tmpWeekNumber : tmpWeekNumber;
                const pastWeeks = Math.floor(dayOfYear / 7) + 1;
                const fixedPastWeeks = weekNumber < firstWeekNumber ? pastWeeks : pastWeeks + 1;
                console.log(weekNumber, firstWeekNumber, fixedPastWeeks);
                str.push(String(fixedPastWeeks).padStart(length, "0"));
                break;
              }
              case "D": {
                const firstDayOfYear = new Date(`${Number(parts.year)}-01-01T00:00:00Z`);
                const diff = date.getTime() - firstDayOfYear.getTime();
                const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
                str.push(String(dayOfYear).padStart(length, "0"));
                break;
              }
              case "d": {
                str.push(parts.day.padStart(length, "0"));
                break;
              }
              case "W":
              case "F": {
                const firstDate = new Date(date.valueOf());
                firstDate.setDate(1);
                const firstDays = Math.floor(firstDate.valueOf() / (1000 * 60 * 60 * 24));
                const allDays = Math.floor(date.valueOf() / (1000 * 60 * 60 * 24));
                const firstDayNumberOfWeek = (firstDays % 7) + 1;
                const toDayNumberOfWeek = (allDays % 7) + 1;
                const pastWeeks = 1 + Math.floor((allDays - firstDays) / 7);
                const dayOfWeekInMonth =
                  toDayNumberOfWeek < firstDayNumberOfWeek ? pastWeeks - 1 : pastWeeks;
                str.push(String(dayOfWeekInMonth).padStart(length, "0"));
                break;
              }
              case "E": {
                str.push(length <= 3 ? parts.weekday.slice(0, 3) : parts.weekday);
                break;
              }
              case "u": {
                str.push(String(weekDayMap[parts.weekday]).padStart(length, "0"));
                break;
              }
              case "a": {
                str.push(parts.dayPeriod);
                break;
              }
              case "H": {
                const rawHour = Number(parts.hour) % 12;
                const hour = parts.dayPeriod === "PM" ? rawHour + 12 : rawHour;
                str.push(String(hour).padStart(length, "0"));
                break;
              }
              case "k": {
                const hour =
                  parts.dayPeriod === "PM" ? Number(parts.hour) + 12 : Number(parts.hour);
                str.push((hour === 0 ? "24" : String(hour)).padStart(length, "0"));
                break;
              }
              case "K": {
                str.push(parts.hour.padStart(length, "0"));
                break;
              }
              case "h": {
                str.push((Number(parts.hour) === 0 ? "12" : parts.hour).padStart(length, "0"));
                break;
              }
              case "m": {
                str.push(parts.minute.padStart(length, "0"));
                break;
              }
              case "s": {
                str.push(parts.second.padStart(length, "0"));
                break;
              }
              case "S": {
                str.push(parts.fractionalSecond.padStart(length, "0"));
                break;
              }
              case "z": {
                // TODO: Long format
                str.push(parts.timeZoneName);
                break;
              }
              case "Z": {
                const absMin = Math.abs(offsetTotalMin);
                const sign = offsetTotalMin >= 0 ? "+" : "-";
                const hh = String(Math.floor(absMin / 60)).padStart(2, "0");
                const mm = String(absMin % 60).padStart(2, "0");
                str.push(`${sign}${hh}${mm}`);
                break;
              }
              case "X": {
                if (length > 3) {
                  throw new Error("Date format error: X");
                }
                if (parts.timeZoneName === "GMT") {
                  str.push("Z");
                } else {
                  const absMin = Math.abs(offsetTotalMin);
                  const sign = offsetTotalMin >= 0 ? "+" : "-";
                  const hh = String(Math.floor(absMin / 60)).padStart(2, "0");
                  const mm = String(absMin % 60).padStart(2, "0");

                  let offset = `${sign}${hh}`;
                  if (length === 3) {
                    offset += ":";
                  }
                  if (length >= 2) {
                    offset += mm;
                  }
                  str.push(offset);
                }
                break;
              }
            }
            target = isFormatChar ? ch : "";
            if (!target) {
              str.push(ch);
            }
            start = i;
          }
        } else {
          target = ch;
          start = i;
        }
      } else {
        str.push(ch);
      }
    }

    return str.join("");
  };
  formatString = (template: string, ...args: any[]) => {
    // https://docs.oracle.com/javase/7/docs/api/java/util/Formatter.html#syntax
    throw new Error("Method not implemented.");
  };
  getUuid = () => {
    return crypto.randomUUID();
  };
  gzip = (blob: GoogleAppsScript.Base.BlobSource, name?: string) => {
    const copiedBlob = blob.getBlob().copyBlob();
    const buffer = zlib.gzipSync(Buffer.from(copiedBlob.getBytes()));
    if (name) {
      copiedBlob.setName(name);
    }
    copiedBlob.setBytes(Array.from(new Int8Array(buffer)));

    return copiedBlob;
  };
  newBlob = (data: GoogleAppsScript.Byte[] | string, contentType?: string, name?: string) => {
    const blob = new Blob(name);
    if (typeof data === "string") {
      blob.setDataFromString(data);
    } else {
      blob.setBytes(data);
    }
    blob.setContentType(contentType ?? null);

    return blob;
  };
  parseCsv = (csv: string, delimiter: GoogleAppsScript.Char = ",") => {
    if (delimiter.length !== 1) {
      throw new Error(`Cannot convert ${delimiter} to char.`);
    }
    return csv.split("\n").map((dim1) => dim1.split(delimiter));
  };
  parseDate = (date: string, timeZone: string, format: string) => {
    throw new Error("Method not implemented.");
  };
  sleep = (milliseconds: GoogleAppsScript.Integer) => {
    const sharedBuffer = new SharedArrayBuffer(4);
    const arrayBuffer = new Int32Array(sharedBuffer);
    const delayMs = Math.min(milliseconds, 300000);
    Atomics.wait(arrayBuffer, 0, 0, delayMs);
  };
  ungzip = (blob: GoogleAppsScript.Base.BlobSource) => {
    const copiedBlob = blob.getBlob().copyBlob();
    const buffer = zlib.gunzipSync(Buffer.from(copiedBlob.getBytes()));
    copiedBlob.setBytes(Array.from(new Int8Array(buffer)));

    return copiedBlob;
  };
  unzip = (blob: GoogleAppsScript.Base.BlobSource) => {
    throw new Error("Method not implemented.");
  };
  zip = (blobs: GoogleAppsScript.Base.BlobSource[], name?: string) => {
    throw new Error("Method not implemented.");
  };
  /** @deprecated DO NOT USE */
  // oxlint-disable-next-line no-unused-vars
  jsonParse = (jsonString: string) => {
    throw new Error("Utilities#jsonParse() is deprecated. Do not use.");
  };
  /** @deprecated DO NOT USE */
  // oxlint-disable-next-line no-unused-vars
  jsonStringify = (obj: any) => {
    throw new Error("Utilities#jsonStringify() is deprecated. Do not use.");
  };
}
