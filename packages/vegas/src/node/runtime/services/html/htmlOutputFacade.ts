import type { CreateGasArray, CreateGasObject } from "../../globals/object";
import { createGasServiceObject } from "../../globals/serviceObject";

export interface HtmlOutputImplementation extends GoogleAppsScript.HTML.HtmlOutput {
  getXFrameOptionsMode(): string | null | undefined;
}

export interface CreateHtmlOutputFacadeOptions {
  createObject?: CreateGasObject;
  createArray?: CreateGasArray;
}

export interface HtmlOutputFacadeFactory {
  create(
    implementation: HtmlOutputImplementation,
    options?: CreateHtmlOutputFacadeOptions,
  ): GoogleAppsScript.HTML.HtmlOutput;
  resolve(value: unknown): HtmlOutputImplementation | undefined;
  resolveXFrameOptionsMode(value: unknown): string | null | undefined;
}

const defaultCreateGasArray: CreateGasArray = <T>() => [] as T[];

export function createHtmlOutputFacadeFactory(): HtmlOutputFacadeFactory {
  const htmlOutputImplementations = new WeakMap<object, HtmlOutputImplementation>();

  const metaTagFacades = new WeakMap<object, GoogleAppsScript.HTML.HtmlOutputMetaTag>();

  const createMetaTagFacade = (
    implementation: GoogleAppsScript.HTML.HtmlOutputMetaTag,
    createObject?: CreateGasObject,
  ): GoogleAppsScript.HTML.HtmlOutputMetaTag => {
    const existing = metaTagFacades.get(implementation);

    if (existing) {
      return existing;
    }

    const value = createGasServiceObject(
      {
        entries: [
          {
            name: "toString",
            value: () => "HtmlOutputMetaTag",
            writable: true,
          },
          {
            name: "getContent",
            value: () => implementation.getContent(),
            writable: true,
          },
          {
            name: "getName",
            value: () => implementation.getName(),
            writable: true,
          },
        ],
      },
      createObject,
    ) as unknown as GoogleAppsScript.HTML.HtmlOutputMetaTag;

    metaTagFacades.set(implementation, value);

    return value;
  };

  const create = (
    implementation: HtmlOutputImplementation,
    options: CreateHtmlOutputFacadeOptions = {},
  ): GoogleAppsScript.HTML.HtmlOutput => {
    const { createObject, createArray = defaultCreateGasArray } = options;

    let value: Record<string, unknown>;

    value = createGasServiceObject(
      {
        entries: [
          {
            name: "toString",
            value: () => "HtmlOutput",
            writable: true,
          },
          {
            name: "addMetaTag",
            value: (name: string, content: string) => {
              implementation.addMetaTag(name, content);
              return value;
            },
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
            name: "appendUntrusted",
            value: (addedContent: string) => {
              implementation.appendUntrusted(addedContent);
              return value;
            },
            writable: true,
          },
          {
            name: "asTemplate",
            value: () => implementation.asTemplate(),
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
            name: "getAs",
            value: (contentType: string) => implementation.getAs(contentType),
            writable: true,
          },
          {
            name: "getBlob",
            value: () => implementation.getBlob(),
            writable: true,
          },
          {
            name: "getContent",
            value: () => implementation.getContent(),
            writable: true,
          },
          {
            name: "getFaviconUrl",
            value: () => implementation.getFaviconUrl(),
            writable: true,
          },
          {
            name: "getHeight",
            value: () => implementation.getHeight(),
            writable: true,
          },
          {
            name: "getMetaTags",
            value: () => {
              const metaTags = createArray<GoogleAppsScript.HTML.HtmlOutputMetaTag>();

              for (const metaTag of implementation.getMetaTags()) {
                metaTags.push(createMetaTagFacade(metaTag, createObject));
              }

              return metaTags;
            },
            writable: true,
          },
          {
            name: "getTitle",
            value: () => implementation.getTitle(),
            writable: true,
          },
          {
            name: "getWidth",
            value: () => implementation.getWidth(),
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
            name: "setFaviconUrl",
            value: (iconUrl: string) => {
              implementation.setFaviconUrl(iconUrl);
              return value;
            },
            writable: true,
          },
          {
            name: "setHeight",
            value: (height: GoogleAppsScript.Integer) => {
              implementation.setHeight(height);
              return value;
            },
            writable: true,
          },
          {
            name: "setSandboxMode",
            value: (mode: GoogleAppsScript.HTML.SandboxMode) => {
              implementation.setSandboxMode(mode);
              return value;
            },
            writable: true,
          },
          {
            name: "setTitle",
            value: (title: string) => {
              implementation.setTitle(title);
              return value;
            },
            writable: true,
          },
          {
            name: "setWidth",
            value: (width: GoogleAppsScript.Integer) => {
              implementation.setWidth(width);
              return value;
            },
            writable: true,
          },
          {
            name: "setXFrameOptionsMode",
            value: (mode: GoogleAppsScript.HTML.XFrameOptionsMode) => {
              implementation.setXFrameOptionsMode(mode);
              return value;
            },
            writable: true,
          },
        ],
      },
      createObject,
    );

    htmlOutputImplementations.set(value, implementation);

    return value as unknown as GoogleAppsScript.HTML.HtmlOutput;
  };

  const resolveXFrameOptionsMode = (value: unknown): string | null | undefined => {
    if (value !== null && (typeof value === "object" || typeof value === "function")) {
      const implementation = resolve(value);

      if (implementation) {
        return implementation.getXFrameOptionsMode();
      }

      const fallback = (
        value as {
          getXFrameOptionsMode?: unknown;
        }
      ).getXFrameOptionsMode;

      if (typeof fallback === "function") {
        return Reflect.apply(fallback, value, []) as string | null | undefined;
      }
    }

    throw new TypeError("Expected an HtmlOutput value with runtime X-Frame metadata.");
  };

  const resolve = (value: unknown): HtmlOutputImplementation | undefined => {
    if (value === null || (typeof value !== "object" && typeof value !== "function")) {
      return undefined;
    }

    return htmlOutputImplementations.get(value as object);
  };

  return {
    create,
    resolve,
    resolveXFrameOptionsMode,
  };
}
