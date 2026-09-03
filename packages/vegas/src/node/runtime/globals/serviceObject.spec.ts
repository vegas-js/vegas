import vm from "node:vm";

import { expect, test } from "vitest";

import { createVmGasObjectFactory } from "./object";
import { createGasServiceObject } from "./serviceObject";

test("creates service object in the supplied VM realm", () => {
  const context = vm.createContext({});
  const createObject = createVmGasObjectFactory(context);
  const service = createGasServiceObject({ entries: [] }, createObject);
  context.Service = service;

  expect(vm.runInContext("Object.getPrototypeOf(Service) === Object.prototype", context)).toBe(
    true,
  );
});

test("defines writable entries with GAS property semantics", () => {
  const entryValue = () => undefined;
  const service = createGasServiceObject({
    entries: [
      {
        name: "getValue",
        value: entryValue,
        writable: true,
      },
    ],
  });

  expect(Object.getOwnPropertyDescriptor(service, "getValue")).toEqual({
    value: entryValue,
    configurable: true,
    enumerable: true,
    writable: true,
  });
});

test("defines non-writable with GAS property semantics", () => {
  const entryValue = {};
  const service = createGasServiceObject({
    entries: [
      {
        name: "log",
        value: entryValue,
        writable: false,
      },
    ],
  });

  expect(Object.getOwnPropertyDescriptor(service, "log")).toEqual({
    value: entryValue,
    configurable: true,
    enumerable: true,
    writable: false,
  });
});

test("preserves definition property order", () => {
  const service = createGasServiceObject({
    entries: [
      {
        name: "first",
        value() {},
        writable: true,
      },
      {
        name: "second",
        value: {},
        writable: false,
      },
      {
        name: "third",
        value() {},
        writable: true,
      },
    ],
  });

  expect(Object.getOwnPropertyNames(service)).toEqual(["first", "second", "third"]);
});
