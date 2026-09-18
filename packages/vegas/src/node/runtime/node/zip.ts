import zlib from "node:zlib";

import type { UtilitiesArchiveEntry } from "../utilities-capability";

const LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const CENTRAL_DIRECTORY_HEADER_SIGNATURE = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;
const UTF8_FLAG = 0x0800;
const ENCRYPTED_FLAG = 0x0001;
const STORED_METHOD = 0;
const DEFLATE_METHOD = 8;
const VERSION_20 = 20;
const DOS_EPOCH_DATE = 0x0021;
const MAX_UINT16 = 0xffff;
const MAX_UINT32 = 0xffffffff;
const MAX_EOCD_SEARCH = 22 + MAX_UINT16;

const CRC32_TABLE = Uint32Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit++) {
    crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return crc >>> 0;
});

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const value of data) {
    crc = CRC32_TABLE[(crc ^ value) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function assertClassicZipValue(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_UINT32) {
    throw new RangeError(`${label} requires ZIP64, which is not supported by Vegas.`);
  }
}

function encodeEntryName(name: string): Buffer {
  if (name.length === 0) throw new RangeError("ZIP entries must have a non-empty name.");
  if (name.endsWith("/")) {
    throw new RangeError("Directory entries are not supported by Utilities.zip().");
  }

  const encoded = Buffer.from(name, "utf8");
  if (encoded.length > MAX_UINT16) {
    throw new RangeError("ZIP entry name is too long.");
  }
  return encoded;
}

interface EncodedEntry {
  readonly name: Buffer;
  readonly crc: number;
  readonly compressed: Buffer;
  readonly uncompressedSize: number;
  readonly localOffset: number;
}

function createLocalFileRecord(
  entry: UtilitiesArchiveEntry,
  localOffset: number,
): {
  readonly record: Buffer;
  readonly encoded: EncodedEntry;
} {
  const name = encodeEntryName(entry.name);
  const data = Buffer.from(entry.data);
  const compressed = zlib.deflateRawSync(data);
  assertClassicZipValue(data.length, "ZIP entry size");
  assertClassicZipValue(compressed.length, "ZIP compressed entry size");
  assertClassicZipValue(localOffset, "ZIP local-header offset");

  const header = Buffer.alloc(30);
  header.writeUInt32LE(LOCAL_FILE_HEADER_SIGNATURE, 0);
  header.writeUInt16LE(VERSION_20, 4);
  header.writeUInt16LE(UTF8_FLAG, 6);
  header.writeUInt16LE(DEFLATE_METHOD, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(DOS_EPOCH_DATE, 12);
  const crc = crc32(data);
  header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(compressed.length, 18);
  header.writeUInt32LE(data.length, 22);
  header.writeUInt16LE(name.length, 26);
  header.writeUInt16LE(0, 28);

  return {
    record: Buffer.concat([header, name, compressed]),
    encoded: {
      name,
      crc,
      compressed,
      uncompressedSize: data.length,
      localOffset,
    },
  };
}

function createCentralDirectoryRecord(entry: EncodedEntry): Buffer {
  const header = Buffer.alloc(46);
  header.writeUInt32LE(CENTRAL_DIRECTORY_HEADER_SIGNATURE, 0);
  header.writeUInt16LE(VERSION_20, 4);
  header.writeUInt16LE(VERSION_20, 6);
  header.writeUInt16LE(UTF8_FLAG, 8);
  header.writeUInt16LE(DEFLATE_METHOD, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt16LE(DOS_EPOCH_DATE, 14);
  header.writeUInt32LE(entry.crc, 16);
  header.writeUInt32LE(entry.compressed.length, 20);
  header.writeUInt32LE(entry.uncompressedSize, 24);
  header.writeUInt16LE(entry.name.length, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0, 38);
  header.writeUInt32LE(entry.localOffset, 42);
  return Buffer.concat([header, entry.name]);
}

export function createZip(entries: readonly UtilitiesArchiveEntry[]): Uint8Array {
  if (entries.length > MAX_UINT16) {
    throw new RangeError(
      "ZIP archive entry count requires ZIP64, which is not supported by Vegas.",
    );
  }

  const localRecords: Buffer[] = [];
  const encodedEntries: EncodedEntry[] = [];
  let localOffset = 0;
  for (const entry of entries) {
    const { record, encoded } = createLocalFileRecord(entry, localOffset);
    localRecords.push(record);
    encodedEntries.push(encoded);
    localOffset += record.length;
    assertClassicZipValue(localOffset, "ZIP archive size");
  }

  const centralRecords = encodedEntries.map(createCentralDirectoryRecord);
  const centralDirectory = Buffer.concat(centralRecords);
  assertClassicZipValue(centralDirectory.length, "ZIP central-directory size");
  assertClassicZipValue(localOffset, "ZIP central-directory offset");

  const end = Buffer.alloc(22);
  end.writeUInt32LE(END_OF_CENTRAL_DIRECTORY_SIGNATURE, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(localOffset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localRecords, centralDirectory, end]);
}

function findEndOfCentralDirectory(archive: Buffer): number {
  const firstOffset = Math.max(0, archive.length - MAX_EOCD_SEARCH);
  for (let offset = archive.length - 22; offset >= firstOffset; offset--) {
    if (archive.readUInt32LE(offset) !== END_OF_CENTRAL_DIRECTORY_SIGNATURE) continue;

    const commentLength = archive.readUInt16LE(offset + 20);
    if (offset + 22 + commentLength === archive.length) return offset;
  }
  throw new SyntaxError("ZIP end-of-central-directory record was not found.");
}

function decodeEntryName(data: Buffer, flags: number): string {
  if ((flags & UTF8_FLAG) !== 0) return data.toString("utf8");
  if (data.some((value) => value > 0x7f)) {
    throw new RangeError(
      "Non-ASCII ZIP entry names without the UTF-8 flag are not supported by Vegas.",
    );
  }
  return data.toString("ascii");
}

function extractEntryData(
  archive: Buffer,
  localOffset: number,
  compressedSize: number,
  method: number,
): Buffer {
  if (localOffset + 30 > archive.length) throw new SyntaxError("Invalid ZIP local file header.");
  if (archive.readUInt32LE(localOffset) !== LOCAL_FILE_HEADER_SIGNATURE) {
    throw new SyntaxError("Invalid ZIP local file header signature.");
  }

  const nameLength = archive.readUInt16LE(localOffset + 26);
  const extraLength = archive.readUInt16LE(localOffset + 28);
  const dataOffset = localOffset + 30 + nameLength + extraLength;
  const dataEnd = dataOffset + compressedSize;
  if (dataEnd > archive.length) throw new SyntaxError("ZIP entry data extends beyond the archive.");

  const compressed = archive.subarray(dataOffset, dataEnd);
  if (method === STORED_METHOD) return Buffer.from(compressed);
  if (method === DEFLATE_METHOD) return zlib.inflateRawSync(compressed);
  throw new RangeError(`ZIP compression method ${method} is not supported by Vegas.`);
}

export function extractZip(data: Uint8Array): UtilitiesArchiveEntry[] {
  const archive = Buffer.from(data);
  if (archive.length < 22) throw new SyntaxError("ZIP archive is too short.");

  const endOffset = findEndOfCentralDirectory(archive);
  const disk = archive.readUInt16LE(endOffset + 4);
  const centralDisk = archive.readUInt16LE(endOffset + 6);
  const entriesOnDisk = archive.readUInt16LE(endOffset + 8);
  const entryCount = archive.readUInt16LE(endOffset + 10);
  const centralSize = archive.readUInt32LE(endOffset + 12);
  const centralOffset = archive.readUInt32LE(endOffset + 16);

  if (disk !== 0 || centralDisk !== 0 || entriesOnDisk !== entryCount) {
    throw new RangeError("Multi-disk ZIP archives are not supported by Vegas.");
  }
  if (entryCount === MAX_UINT16 || centralSize === MAX_UINT32 || centralOffset === MAX_UINT32) {
    throw new RangeError("ZIP64 archives are not supported by Vegas.");
  }
  if (centralOffset + centralSize > endOffset) {
    throw new SyntaxError("Invalid ZIP central-directory bounds.");
  }

  const entries: UtilitiesArchiveEntry[] = [];
  let offset = centralOffset;
  for (let index = 0; index < entryCount; index++) {
    if (offset + 46 > archive.length) throw new SyntaxError("Invalid ZIP central-directory entry.");
    if (archive.readUInt32LE(offset) !== CENTRAL_DIRECTORY_HEADER_SIGNATURE) {
      throw new SyntaxError("Invalid ZIP central-directory signature.");
    }

    const flags = archive.readUInt16LE(offset + 8);
    if ((flags & ENCRYPTED_FLAG) !== 0) {
      throw new RangeError("Encrypted ZIP entries are not supported by Vegas.");
    }
    const method = archive.readUInt16LE(offset + 10);
    const expectedCrc = archive.readUInt32LE(offset + 16);
    const compressedSize = archive.readUInt32LE(offset + 20);
    const uncompressedSize = archive.readUInt32LE(offset + 24);
    const nameLength = archive.readUInt16LE(offset + 28);
    const extraLength = archive.readUInt16LE(offset + 30);
    const commentLength = archive.readUInt16LE(offset + 32);
    const diskStart = archive.readUInt16LE(offset + 34);
    const localOffset = archive.readUInt32LE(offset + 42);

    if (
      compressedSize === MAX_UINT32 ||
      uncompressedSize === MAX_UINT32 ||
      localOffset === MAX_UINT32 ||
      diskStart === MAX_UINT16
    ) {
      throw new RangeError("ZIP64 entries are not supported by Vegas.");
    }
    if (diskStart !== 0)
      throw new RangeError("Multi-disk ZIP archives are not supported by Vegas.");

    const nameStart = offset + 46;
    const nextOffset = nameStart + nameLength + extraLength + commentLength;
    if (nextOffset > archive.length)
      throw new SyntaxError("Invalid ZIP central-directory entry size.");

    const name = decodeEntryName(archive.subarray(nameStart, nameStart + nameLength), flags);
    if (!name.endsWith("/")) {
      const inflated = extractEntryData(archive, localOffset, compressedSize, method);
      if (inflated.length !== uncompressedSize) {
        throw new SyntaxError(`ZIP entry '${name}' has an invalid uncompressed size.`);
      }
      if (crc32(inflated) !== expectedCrc) {
        throw new SyntaxError(`ZIP entry '${name}' failed CRC-32 validation.`);
      }
      entries.push({ name, data: inflated });
    }

    offset = nextOffset;
  }

  if (offset !== centralOffset + centralSize) {
    throw new SyntaxError("ZIP central-directory size does not match its entries.");
  }
  return entries;
}
