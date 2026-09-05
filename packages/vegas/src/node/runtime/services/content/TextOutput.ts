export interface TextOutputImplementation {
  append(addedContent: string): TextOutputImplementation;

  clear(): TextOutputImplementation;

  downloadAsFile(filename: string): TextOutputImplementation;

  getContent(): string | null;

  getFileName(): string | null;

  getMimeType(): GoogleAppsScript.Content.MimeType;

  setContent(content: string): TextOutputImplementation;

  setMimeType(mimeType: GoogleAppsScript.Content.MimeType): TextOutputImplementation;
}

export class TextOutput implements TextOutputImplementation {
  #content: string | null;
  #fileName: string | null = null;
  #mimeType: GoogleAppsScript.Content.MimeType;

  constructor(content: string | null, mimeType: GoogleAppsScript.Content.MimeType) {
    this.#content = content;
    this.#mimeType = mimeType;
  }

  append(addedContent: string): this {
    this.#content = (this.#content ?? "") + addedContent;

    return this;
  }

  clear(): this {
    this.#content = null;

    return this;
  }

  downloadAsFile(filename: string): this {
    this.#fileName = filename;

    return this;
  }

  getContent(): string | null {
    return this.#content;
  }

  getFileName(): string | null {
    return this.#fileName;
  }

  getMimeType(): GoogleAppsScript.Content.MimeType {
    return this.#mimeType;
  }

  setContent(content: string): this {
    this.#content = content;

    return this;
  }

  setMimeType(mimeType: GoogleAppsScript.Content.MimeType): this {
    this.#mimeType = mimeType;

    return this;
  }
}
