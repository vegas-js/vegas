import vm from "node:vm";

import { describe, expect, test } from "vitest";

import { createVmGasObjectFactory } from "../../globals/object";
import { createContentService } from "./facade";
import { createTextOutputFacadeFactory } from "./textOutputFacade";

describe("createContentService", () => {
  test("creates the characterized ContentService surface", () => {
    const contentService = createContentService();

    // oxlint-disable-next-line no-base-to-string
    expect(String(contentService)).toBe("ContentService");

    expect(Object.getOwnPropertyNames(contentService).sort()).toEqual(
      ["MimeType", "createTextOutput", "toString"].sort(),
    );

    expect(Object.getOwnPropertyDescriptor(contentService, "toString")).toMatchObject({
      configurable: true,
      enumerable: true,
      writable: true,
    });

    expect(Object.getOwnPropertyDescriptor(contentService, "createTextOutput")).toMatchObject({
      configurable: true,
      enumerable: true,
      writable: true,
    });

    expect(Object.getOwnPropertyDescriptor(contentService, "MimeType")).toMatchObject({
      configurable: true,
      enumerable: true,
      writable: false,
    });
  });

  test("creates the characterized ContentService MimeType enum", () => {
    const { MimeType } = createContentService();

    // oxlint-disable-next-line no-base-to-string
    expect(String(MimeType)).toBe("TEXT");

    expect((MimeType.CSV as any).ordinal()).toBe(0);

    expect((MimeType.ICAL as any).ordinal()).toBe(1);

    expect((MimeType.JAVASCRIPT as any).ordinal()).toBe(2);

    expect((MimeType.JSON as any).ordinal()).toBe(3);

    expect((MimeType.TEXT as any).ordinal()).toBe(4);

    expect((MimeType.VCARD as any).ordinal()).toBe(5);

    expect((MimeType.CSV as any).compareTo(MimeType.VCARD)).toBe(-5);

    expect((MimeType.TEXT as any).compareTo(MimeType.JSON)).toBe(1);

    expect((MimeType.JSON as any).name()).toBe("JSON");

    expect((MimeType.JSON as any).toJSON()).toBe("JSON");
  });

  test("creates characterized TextOutput values", () => {
    const contentService = createContentService();

    const empty = contentService.createTextOutput();

    expect(empty.getContent()).toBeNull();

    expect(empty.getFileName()).toBeNull();

    expect(empty.getMimeType()).toBe(contentService.MimeType.TEXT);

    // oxlint-disable-next-line no-base-to-string
    expect(String(empty)).toBe("TextOutput");

    const populated = contentService.createTextOutput("initial");

    expect(populated.getContent()).toBe("initial");
  });

  test("creates ContentService and TextOutput values in the supplied VM realm", () => {
    const context = vm.createContext({});

    const createObject = createVmGasObjectFactory(context);

    const factory = createTextOutputFacadeFactory();

    const contentService = createContentService({
      createObject,
      textOutputFacadeFactory: factory,
    });

    const output = contentService.createTextOutput("vegas");

    context.ContentService = contentService;

    context.output = output;

    expect(
      vm.runInContext(
        `
              Object.getPrototypeOf(
                ContentService
              ) === Object.prototype
            `,
        context,
      ),
    ).toBe(true);

    expect(
      vm.runInContext(
        `
              Object.getPrototypeOf(
                ContentService.MimeType
              ) === Object.prototype
            `,
        context,
      ),
    ).toBe(true);

    expect(
      vm.runInContext(
        `
              Object.getPrototypeOf(
                output
              ) === Object.prototype
            `,
        context,
      ),
    ).toBe(true);

    expect(factory.resolve(output)).toBeDefined();
  });
});
