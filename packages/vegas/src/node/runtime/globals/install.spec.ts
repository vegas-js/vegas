import { expect, test } from "vitest";

import { installGasGlobal } from "./install";

test("installs a GAS-compatible global property", () => {
  const target = {};
  const value = {};

  installGasGlobal(target, "ScriptApp", value);

  expect(Object.getOwnPropertyDescriptor(target, "ScriptApp")).toEqual({
    value,
    configurable: true,
    enumerable: false,
    writable: true,
  });
});
