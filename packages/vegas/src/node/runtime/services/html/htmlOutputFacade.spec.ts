import vm from "node:vm";

import { describe, expect, test } from "vitest";

import { createVmGasArrayFactory, createVmGasObjectFactory } from "../../globals/object";
import { HtmlOutput } from "./HtmlOutput";
import { createHtmlOutputFacadeFactory } from "./htmlOutputFacade";

const defaultXFrameOptionsMode = {} as GoogleAppsScript.HTML.XFrameOptionsMode;

function createImplementation() {
  return new HtmlOutput("<p>vegas-reference</p>", defaultXFrameOptionsMode);
}

describe("createHtmlOutputFacadeFactory", () => {
  test("creates HtmlOutput and HtmlOutputMetaTag facades in the supplied VM realm", () => {
    const context = vm.createContext({});
    const createObject = createVmGasObjectFactory(context);
    const createArray = createVmGasArrayFactory(context);

    const factory = createHtmlOutputFacadeFactory();

    const output = factory.create(createImplementation(), {
      createObject,
      createArray,
    });

    output.addMetaTag("viewport", "width=device-width");

    const metaTags = output.getMetaTags();
    const metaTag = metaTags[0];

    context.output = output;
    context.metaTags = metaTags;
    context.metaTag = metaTag;

    expect(vm.runInContext("Object.getPrototypeOf(output) === Object.prototype", context)).toBe(
      true,
    );

    expect(vm.runInContext("Object.getPrototypeOf(metaTags) === Array.prototype", context)).toBe(
      true,
    );

    expect(vm.runInContext("Object.getPrototypeOf(metaTag) === Object.prototype", context)).toBe(
      true,
    );
  });

  test("creates GAS-compatible HtmlOutput own properties", () => {
    const factory = createHtmlOutputFacadeFactory();

    const output = factory.create(createImplementation());

    const methodNames = [
      "addMetaTag",
      "append",
      "appendUntrusted",
      "asTemplate",
      "clear",
      "getAs",
      "getBlob",
      "getContent",
      "getFaviconUrl",
      "getHeight",
      "getMetaTags",
      "getTitle",
      "getWidth",
      "setContent",
      "setFaviconUrl",
      "setHeight",
      "setSandboxMode",
      "setTitle",
      "setWidth",
      "setXFrameOptionsMode",
      "toString",
    ];

    expect(Object.getOwnPropertyNames(output).sort()).toEqual([...methodNames].sort());

    expect("getXFrameOptionsMode" in (output as object)).toBe(false);

    for (const name of methodNames) {
      expect(Object.getOwnPropertyDescriptor(output, name)).toMatchObject({
        configurable: true,
        enumerable: true,
        writable: true,
      });

      expect(typeof (output as unknown as Record<string, unknown>)[name]).toBe("function");
    }

    expect(String(output as any)).toBe("HtmlOutput");
  });

  test("creates GAS-compatible HtmlOutputMetaTag own properties", () => {
    const factory = createHtmlOutputFacadeFactory();

    const output = factory.create(createImplementation());

    output.addMetaTag("viewport", "width=device-width");

    const metaTag = output.getMetaTags()[0];

    expect(metaTag).toBeDefined();

    expect(Object.getOwnPropertyNames(metaTag).sort()).toEqual(
      ["getContent", "getName", "toString"].sort(),
    );

    for (const name of ["getContent", "getName", "toString"]) {
      expect(Object.getOwnPropertyDescriptor(metaTag, name)).toMatchObject({
        configurable: true,
        enumerable: true,
        writable: true,
      });
    }

    expect(String(metaTag as any)).toBe("HtmlOutputMetaTag");
  });

  test("preserves characterized HtmlOutput identity behavior", () => {
    const factory = createHtmlOutputFacadeFactory();

    const output = factory.create(createImplementation());

    const otherOutput = factory.create(createImplementation());

    expect(output).not.toBe(otherOutput);

    expect(output.addMetaTag("viewport", "width=device-width")).toBe(output);

    expect(output.append("trusted")).toBe(output);

    expect(output.appendUntrusted("<untrusted>")).toBe(output);

    expect(output.clear()).toBe(output);
    expect(output.setContent("updated")).toBe(output);

    expect(output.setFaviconUrl("https://example.com/favicon.ico")).toBe(output);

    expect(output.setHeight(480)).toBe(output);

    expect(output.setSandboxMode({} as GoogleAppsScript.HTML.SandboxMode)).toBe(output);

    expect(output.setTitle("title")).toBe(output);

    expect(output.setWidth(640)).toBe(output);

    expect(output.setXFrameOptionsMode(defaultXFrameOptionsMode)).toBe(output);

    const metaTagsA = output.getMetaTags();
    const metaTagsB = output.getMetaTags();

    expect(metaTagsA).not.toBe(metaTagsB);
    expect(metaTagsA[0]).toBe(metaTagsB[0]);
  });

  test("keeps X-Frame metadata internal to the HtmlOutput facade", () => {
    const implementation = createImplementation();

    const factory = createHtmlOutputFacadeFactory();

    const output = factory.create(implementation);

    expect("getXFrameOptionsMode" in (output as object)).toBe(false);

    expect(factory.resolveXFrameOptionsMode(output)).toBe("SAMEORIGIN");
  });
});
