export interface UtilitiesArchiveEntry {
  readonly name: string;
  readonly data: Uint8Array;
}

export interface UtilitiesCapability {
  encodeString(value: string, encoding: "ascii" | "utf8"): Uint8Array;

  encodeBase64(data: Uint8Array): string;

  decodeBase64(value: string): Uint8Array;

  computeDigest(
    algorithm: "md5" | "sha1" | "sha256" | "sha384" | "sha512",
    data: Uint8Array,
  ): Uint8Array;

  computeHmac(
    algorithm: "md5" | "sha1" | "sha256" | "sha384" | "sha512",
    value: Uint8Array,
    key: Uint8Array,
  ): Uint8Array;

  computeRsaSignature(algorithm: "sha1" | "sha256", value: Uint8Array, key: string): Uint8Array;

  randomUuid(): string;

  sleep(milliseconds: number): void;

  gzip(data: Uint8Array): Uint8Array;

  gunzip(data: Uint8Array): Uint8Array;

  zip(entries: readonly UtilitiesArchiveEntry[]): Uint8Array;

  unzip(data: Uint8Array): readonly UtilitiesArchiveEntry[];
}
