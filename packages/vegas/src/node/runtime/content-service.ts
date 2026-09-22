import { CONTENT_MIME_TYPE } from "./content-enum";
import { TextOutput } from "./text-output";

// https://developers.google.com/apps-script/reference/content/content-service
export class ContentService {
  readonly MimeType = CONTENT_MIME_TYPE;

  createTextOutput(content = ""): TextOutput {
    return new TextOutput(content);
  }
}

export function createContentService(): ContentService {
  return new ContentService();
}
