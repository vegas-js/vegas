import { createGasEnum } from "../../globals/enum";
import type { CreateGasObject } from "../../globals/object";
import { createGasServiceObject } from "../../globals/serviceObject";
import { TextOutput } from "./TextOutput";
import { createTextOutputFacadeFactory, type TextOutputFacadeFactory } from "./textOutputFacade";

export interface CreateContentServiceOptions {
  readonly createObject?: CreateGasObject;

  readonly textOutputFacadeFactory?: TextOutputFacadeFactory;
}

export function createContentService(
  options: CreateContentServiceOptions = {},
): GoogleAppsScript.Content.ContentService {
  const { createObject, textOutputFacadeFactory = createTextOutputFacadeFactory() } = options;

  const mimeType = createGasEnum(
    {
      members: ["CSV", "ICAL", "JAVASCRIPT", "JSON", "TEXT", "VCARD"],
      representative: "TEXT",
    },
    createObject,
  );

  const defaultMimeType = mimeType.TEXT as unknown as GoogleAppsScript.Content.MimeType;

  const createTextOutput = (content?: string): GoogleAppsScript.Content.TextOutput => {
    const implementation = new TextOutput(content === undefined ? null : content, defaultMimeType);

    return textOutputFacadeFactory.create(implementation, {
      createObject,
    });
  };

  return createGasServiceObject(
    {
      entries: [
        {
          name: "toString",
          value: () => "ContentService",
          writable: true,
        },
        {
          name: "createTextOutput",
          value: createTextOutput,
          writable: true,
        },
        {
          name: "MimeType",
          value: mimeType,
          writable: false,
        },
      ],
    },
    createObject,
  ) as unknown as GoogleAppsScript.Content.ContentService;
}
