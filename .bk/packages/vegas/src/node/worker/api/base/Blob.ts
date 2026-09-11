// https://developers.google.com/apps-script/reference/base/blob
export class Blob implements GoogleAppsScript.Base.Blob {
  #name: string;
  #bytes: GoogleAppsScript.Byte[];
  #contentType: string | null;

  constructor(name: string = "") {
    this.#name = name;
    this.#bytes = [];
    this.#contentType = null;
  }

  copyBlob = () => {
    return new Blob(this.#name)
      .setBytes(globalThis.structuredClone(this.#bytes))
      .setContentType(this.#contentType);
  };
  getAs = (contentType: string) => {
    throw new Error("Method not implemented.");
  };
  getBytes = () => {
    return this.#bytes;
  };
  getContentType = () => {
    return this.#contentType;
  };
  getDataAsString = (charset?: string) => {
    return Buffer.from(this.#bytes).toString(charset as BufferEncoding);
  };
  getName = () => {
    return this.#name;
  };
  isGoogleType = () => {
    throw new Error("Method not implemented.");
  };
  setBytes = (data: GoogleAppsScript.Byte[]) => {
    this.#bytes = data;
    return this;
  };
  setContentType = (contentType: string | null) => {
    this.#contentType = contentType;
    return this;
  };
  setContentTypeFromExtension = () => {
    throw new Error("Method not implemented.");
  };
  setDataFromString = (string: string, charset?: string) => {
    this.#bytes = Array.from(Buffer.from(string, charset as BufferEncoding));
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
