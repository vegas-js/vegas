import { CONTENT_MIME_TYPE, type ContentMimeType } from "./content-enum";

export interface TextOutputSnapshot {
  readonly content: string;
  readonly fileName: string | null;
  readonly mimeType: ContentMimeType;
}

const SERIALIZE_TEXT_OUTPUT = Symbol("serializeTextOutput");

// https://developers.google.com/apps-script/reference/content/text-output
export class TextOutput {
  #content: string;
  #fileName: string | null = null;
  #mimeType: ContentMimeType = CONTENT_MIME_TYPE.TEXT;

  constructor(content = "") {
    this.#content = content;
  }

  append(addedContent: string): this {
    this.#content += addedContent;
    return this;
  }

  clear(): this {
    this.#content = "";
    return this;
  }

  downloadAsFile(filename: string | null): this {
    // Apps Script documents that illegal filename characters throw, but does not define the
    // rejected character set. Vegas preserves the supplied filename until that contract can be
    // implemented from documented evidence.
    this.#fileName = filename;
    return this;
  }

  getContent(): string {
    return this.#content;
  }

  getFileName(): string | null {
    return this.#fileName;
  }

  getMimeType(): ContentMimeType {
    return this.#mimeType;
  }

  setContent(content: string): this {
    this.#content = content;
    return this;
  }

  setMimeType(mimeType: ContentMimeType): this {
    this.#mimeType = mimeType;
    return this;
  }

  [SERIALIZE_TEXT_OUTPUT](): TextOutputSnapshot {
    return {
      content: this.#content,
      fileName: this.#fileName,
      mimeType: this.#mimeType,
    };
  }
}

export function serializeTextOutput(output: TextOutput): TextOutputSnapshot {
  return output[SERIALIZE_TEXT_OUTPUT]();
}
