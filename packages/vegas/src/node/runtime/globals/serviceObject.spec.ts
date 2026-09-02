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

test("defines methods with GAS property semantics", () => {
  const method = () => undefined;
  const service = createGasServiceObject({
    entries: [
      {
        kind: "method",
        name: "getValue",
        value: method,
      },
    ],
  });

  expect(Object.getOwnPropertyDescriptor(service, "getValue")).toEqual({
    value: method,
    configurable: true,
    enumerable: true,
    writable: true,
  });
});

test("defines properties with GAS property semantics", () => {
  const property = {};
  const service = createGasServiceObject({
    entries: [
      {
        kind: "property",
        name: "AuthMode",
        value: property,
      },
    ],
  });

  expect(Object.getOwnPropertyDescriptor(service, "AuthMode")).toEqual({
    value: property,
    configurable: true,
    enumerable: true,
    writable: false,
  });
});

test("preserves definition property order", () => {
  const service = createGasServiceObject({
    entries: [
      {
        kind: "method",
        name: "first",
        value() {},
      },
      {
        kind: "property",
        name: "second",
        value: {},
      },
      {
        kind: "method",
        name: "third",
        value() {},
      },
    ],
  });

  expect(Object.getOwnPropertyNames(service)).toEqual(["first", "second", "third"]);
});
