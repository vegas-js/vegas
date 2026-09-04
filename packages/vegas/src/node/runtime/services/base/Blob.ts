function toGasByte(value: number): number {
  const unsigned = value & 0xff;

  return unsigned > 0x7f ? unsigned - 0x100 : unsigned;
}

function toBufferEncoding(charset?: string): BufferEncoding | undefined {
  if (charset === undefined) {
    return undefined;
  }

  switch (charset.replaceAll("_", "-").toUpperCase()) {
    case "UTF-8":
      return "utf8";

    case "ISO-8859-1":
      return "latin1";

    case "US-ASCII":
      return "ascii";

    default:
      return charset as BufferEncoding;
  }
}

// https://developers.google.com/apps-script/reference/base/blob
export class Blob implements GoogleAppsScript.Base.Blob {
  #name: string | null;
  #bytes: GoogleAppsScript.Byte[];
  #contentType: string | null;

  constructor(name: string | null = null) {
    this.#name = name;
    this.#bytes = [];
    this.#contentType = null;
  }

  copyBlob = () => {
    return new Blob(this.#name).setBytes(this.#bytes).setContentType(this.#contentType);
  };
  getAs = (contentType: string) => {
    throw new Error("Method not implemented.");
  };
  getBytes = () => {
    return Array.from(this.#bytes);
  };
  getContentType = () => {
    return this.#contentType;
  };
  getDataAsString = (charset?: string) => {
    return Buffer.from(this.#bytes).toString(toBufferEncoding(charset));
  };
  getName = () => {
    return this.#name as unknown as string;
  };
  isGoogleType = () => {
    throw new Error("Method not implemented.");
  };
  setBytes = (data: GoogleAppsScript.Byte[]) => {
    this.#bytes = data.map(toGasByte);
    return this;
  };
  setContentType = (contentType: string | null) => {
    this.#contentType = contentType;
    return this;
  };
  setContentTypeFromExtension = () => {
    if (this.#name?.toLowerCase().endsWith(".txt")) {
      this.#contentType = "text/plain";
    }

    return this;
  };
  setDataFromString = (string: string, charset?: string) => {
    this.#bytes = Array.from(Buffer.from(string, toBufferEncoding(charset)), toGasByte);

    return this;
  };
  setName = (name: string) => {
    this.#name = name;
    return this;
  };
  /** @deprecated DO NOT USE */
  getAllBlobs = () => {
    throw new Error("Blob#getAllBlobs() is deprecated. Do not use.");
  };
  getBlob = () => {
    throw new Error("Method not implemented.");
  };
}
