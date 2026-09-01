import { expect, test } from "vitest";

import { createGasConstants } from "./createGasConstants";

test("creates GAS constant object semantics", () => {
  const mimeType = createGasConstants("MimeType", {
    PDF: "application/pdf",
    PNG: "image/png",
  });

  expect(Object.getPrototypeOf(mimeType)).toBe(Object.prototype);
  expect(String(mimeType)).toBe("MimeType");

  expect(mimeType.PDF).toBe("application/pdf");
  expect(mimeType.PNG).toBe("image/png");

  expect(Object.getOwnPropertyNames(mimeType)).toEqual(["toString", "PDF", "PNG"]);
});

test("creates non-writable GAS constants", () => {
  const mimeType = createGasConstants("MimeType", {
    PDF: "application/pdf",
  });

  expect(Object.getOwnPropertyDescriptor(mimeType, "toString")).toMatchObject({
    configurable: true,
    enumerable: true,
    writable: true,
  });
  expect(Object.getOwnPropertyDescriptor(mimeType, "PDF")).toEqual({
    value: "application/pdf",
    configurable: true,
    enumerable: true,
    writable: false,
  });
});
