import { createRuntimeEnum } from "./runtime-enum";

export const CONTENT_MIME_TYPE = createRuntimeEnum(
  "ATOM",
  "CSV",
  "ICAL",
  "JAVASCRIPT",
  "JSON",
  "RSS",
  "TEXT",
  "VCARD",
  "XML",
);

export type ContentMimeType = (typeof CONTENT_MIME_TYPE)[keyof typeof CONTENT_MIME_TYPE];
