import vm from "node:vm";

import { describe, expect, test } from "vitest";

import { createVmGasObjectFactory } from "../../globals/object";
import { Blob } from "./Blob";
import { createBlobFacadeFactory } from "./blobFacade";

describe("createBlobFacadeFactory", () => {
  test("creates a Blob facade in the supplied VM realm", () => {
    const context = vm.createContext({});
    const createObject = createVmGasObjectFactory(context);

    const factory = createBlobFacadeFactory(createObject);
    const blob = factory.create(new Blob("reference.txt"));

    context.blob = blob;

    expect(vm.runInContext("Object.getPrototypeOf(blob) === Object.prototype", context)).toBe(true);

    expect(vm.runInContext("blob.constructor === Object", context)).toBe(true);

    expect(Object.prototype.toString.call(blob)).toBe("[object Object]");
  });

  test("creates GAS-compatible Blob own properties", () => {
    const factory = createBlobFacadeFactory();
    const blob = factory.create(new Blob("reference.txt"));

    const methodNames = [
      "copyBlob",
      "getAllBlobs",
      "getAs",
      "getBytes",
      "getContentType",
      "getDataAsString",
      "getName",
      "isGoogleType",
      "setBytes",
      "setContentType",
      "setContentTypeFromExtension",
      "setDataFromString",
      "setName",
      "toString",
    ];

    expect(Object.getOwnPropertyNames(blob).sort()).toEqual([...methodNames].sort());

    expect(Object.prototype.hasOwnProperty.call(blob, "getBlob")).toBe(false);

    expect("getBlob" in (blob as object)).toBe(false);

    for (const name of methodNames) {
      expect(Object.getOwnPropertyDescriptor(blob, name)).toMatchObject({
        configurable: true,
        enumerable: true,
        writable: true,
      });

      expect(typeof (blob as unknown as Record<string, unknown>)[name]).toBe("function");
    }
  });

  test("preserves characterized Blob identity behavior", () => {
    const factory = createBlobFacadeFactory();
    const blob = factory.create(new Blob("reference.txt"));

    expect(String(blob as any)).toBe("Blob");

    expect(blob.copyBlob()).not.toBe(blob);
    expect(blob.copyBlob()).not.toBe(blob.copyBlob());

    expect(blob.setName("renamed.txt")).toBe(blob);
    expect(blob.setContentType("text/plain")).toBe(blob);
    expect(blob.setBytes([1, 2, 3])).toBe(blob);
    expect(blob.setDataFromString("vegas-reference")).toBe(blob);
    expect(blob.setContentTypeFromExtension()).toBe(blob);
  });

  test("unwraps Blob facades without exposing getBlob", () => {
    const factory = createBlobFacadeFactory();
    const implementation = new Blob("reference.txt");
    const blob = factory.create(implementation);

    const blobSource = factory.unwrap(blob as unknown as GoogleAppsScript.Base.BlobSource);

    expect(blobSource.getBlob()).toBe(implementation);
    expect("getBlob" in (blob as object)).toBe(false);
  });
});
