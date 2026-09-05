import type { CreateGasObject } from "../../globals/object";
import { createGasServiceObject } from "../../globals/serviceObject";
import type { TextOutputImplementation } from "./TextOutput";

export interface CreateTextOutputFacadeOptions {
  readonly createObject?: CreateGasObject;
}

export interface TextOutputFacadeFactory {
  create(
    implementation: TextOutputImplementation,
    options?: CreateTextOutputFacadeOptions,
  ): GoogleAppsScript.Content.TextOutput;

  resolve(value: unknown): TextOutputImplementation | undefined;
}

export function createTextOutputFacadeFactory(): TextOutputFacadeFactory {
  const implementations = new WeakMap<object, TextOutputImplementation>();

  const create = (
    implementation: TextOutputImplementation,

    options: CreateTextOutputFacadeOptions = {},
  ): GoogleAppsScript.Content.TextOutput => {
    const { createObject } = options;

    let value: Record<string, unknown>;

    value = createGasServiceObject(
      {
        entries: [
          {
            name: "toString",
            value: () => "TextOutput",
            writable: true,
          },
          {
            name: "append",
            value: (addedContent: string) => {
              implementation.append(addedContent);

              return value;
            },
            writable: true,
          },
          {
            name: "clear",
            value: () => {
              implementation.clear();

              return value;
            },
            writable: true,
          },
          {
            name: "downloadAsFile",
            value: (filename: string) => {
              implementation.downloadAsFile(filename);

              return value;
            },
            writable: true,
          },
          {
            name: "getContent",
            value: () => implementation.getContent(),
            writable: true,
          },
          {
            name: "getFileName",
            value: () => implementation.getFileName(),
            writable: true,
          },
          {
            name: "getMimeType",
            value: () => implementation.getMimeType(),
            writable: true,
          },
          {
            name: "setContent",
            value: (content: string) => {
              implementation.setContent(content);

              return value;
            },
            writable: true,
          },
          {
            name: "setMimeType",
            value: (mimeType: GoogleAppsScript.Content.MimeType) => {
              implementation.setMimeType(mimeType);

              return value;
            },
            writable: true,
          },
        ],
      },
      createObject,
    );

    implementations.set(value, implementation);

    return value as unknown as GoogleAppsScript.Content.TextOutput;
  };

  return {
    create,

    resolve(value) {
      if (value === null || (typeof value !== "object" && typeof value !== "function")) {
        return undefined;
      }

      return implementations.get(value as object);
    },
  };
}
