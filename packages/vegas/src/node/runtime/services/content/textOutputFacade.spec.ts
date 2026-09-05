import vm from "node:vm";

import { describe, expect, test } from "vitest";

import { createGasEnum } from "../../globals/enum";
import { createVmGasObjectFactory } from "../../globals/object";
import { TextOutput } from "./TextOutput";
import { createTextOutputFacadeFactory } from "./textOutputFacade";

function createMimeType(createObject?: ReturnType<typeof createVmGasObjectFactory>) {
  return createGasEnum(
    {
      members: ["CSV", "ICAL", "JAVASCRIPT", "JSON", "TEXT", "VCARD"],
      representative: "TEXT",
    },
    createObject,
  );
}

describe("createTextOutputFacadeFactory", () => {
  test("creates a TextOutput facade in the supplied VM realm", () => {
    const context = vm.createContext({});

    const createObject = createVmGasObjectFactory(context);

    const mimeType = createMimeType(createObject);

    const implementation = new TextOutput(
      "vegas-reference",
      mimeType.TEXT as unknown as GoogleAppsScript.Content.MimeType,
    );

    const factory = createTextOutputFacadeFactory();

    const output = factory.create(implementation, {
      createObject,
    });

    context.output = output;

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

    expect(
      vm.runInContext(
        `
              output.constructor ===
              Object
            `,
        context,
      ),
    ).toBe(true);
  });

  test("creates GAS-compatible TextOutput own properties", () => {
    const mimeType = createMimeType();

    const implementation = new TextOutput(
      "vegas-reference",
      mimeType.TEXT as unknown as GoogleAppsScript.Content.MimeType,
    );

    const factory = createTextOutputFacadeFactory();

    const output = factory.create(implementation);

    const methodNames = [
      "append",
      "clear",
      "downloadAsFile",
      "getContent",
      "getFileName",
      "getMimeType",
      "setContent",
      "setMimeType",
      "toString",
    ];

    expect(Object.getOwnPropertyNames(output).sort()).toEqual([...methodNames].sort());

    for (const name of methodNames) {
      expect(Object.getOwnPropertyDescriptor(output, name)).toMatchObject({
        configurable: true,
        enumerable: true,
        writable: true,
      });

      expect(typeof (output as unknown as Record<string, unknown>)[name]).toBe("function");
    }

    // oxlint-disable-next-line no-base-to-string
    expect(String(output)).toBe("TextOutput");
  });

  test("preserves characterized TextOutput mutation and identity behavior", () => {
    const mimeType = createMimeType();

    const factory = createTextOutputFacadeFactory();

    const output = factory.create(
      new TextOutput("initial", mimeType.TEXT as unknown as GoogleAppsScript.Content.MimeType),
    );

    expect(output.append("-append")).toBe(output);

    expect(output.getContent()).toBe("initial-append");

    expect(output.setContent("replaced")).toBe(output);

    expect(output.getContent()).toBe("replaced");

    expect(output.setMimeType(mimeType.JSON as unknown as GoogleAppsScript.Content.MimeType)).toBe(
      output,
    );

    expect(output.getMimeType()).toBe(mimeType.JSON);

    expect(output.downloadAsFile("reference.txt")).toBe(output);

    expect(output.getFileName()).toBe("reference.txt");

    expect(output.clear()).toBe(output);

    expect(output.getContent()).toBeNull();
  });

  test("resolves only TextOutput facades created by the factory", () => {
    const mimeType = createMimeType();

    const implementation = new TextOutput(
      "vegas-reference",
      mimeType.TEXT as unknown as GoogleAppsScript.Content.MimeType,
    );

    const factory = createTextOutputFacadeFactory();

    const output = factory.create(implementation);

    expect(factory.resolve(output)).toBe(implementation);

    expect(factory.resolve({})).toBeUndefined();

    expect(factory.resolve(null)).toBeUndefined();
  });
});
