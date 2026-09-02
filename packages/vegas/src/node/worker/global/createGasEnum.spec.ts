import vm from "node:vm";

import { expect, test } from "vitest";

import { createGasEnum } from "./createGasEnum";
import { createVmGasObjectFactory } from "./createGasObject";

function createAuthMode() {
  return createGasEnum({
    members: ["NONE", "CUSTOM_FUNCTION", "LIMITED", "FULL"],
    representative: "NONE",
  });
}

test("creates enum members in the supplied VM realm", () => {
  const context = vm.createContext({});
  const createObject = createVmGasObjectFactory(context);
  const authMode = createGasEnum(
    {
      members: ["NONE", "FULL"],
      representative: "NONE",
    },
    createObject,
  );
  context.AuthMode = authMode;

  expect(
    vm.runInContext(
      `
        Object.getPrototypeOf(AuthMode) === Object.prototype &&
        Object.getPrototypeOf(AuthMode.FULL) === Object.prototype
      `,
      context,
    ),
  ).toBe(true);
});

test("creates GAS enum identity graph", () => {
  const authMode = createAuthMode();

  expect(authMode).toBe(authMode.NONE);

  expect(authMode.NONE.NONE).toBe(authMode.NONE);
  expect(authMode.NONE.FULL).toBe(authMode.FULL);

  expect(authMode.FULL.NONE).toBe(authMode.NONE);
  expect(authMode.FULL.FULL).toBe(authMode.FULL);
});

test("creates GAS enum member semantics", () => {
  const authMode = createAuthMode();

  expect(String(authMode)).toBe("NONE");

  expect(String(authMode.FULL)).toBe("FULL");
  expect(authMode.FULL.name()).toBe("FULL");
  expect(authMode.FULL.ordinal()).toBe(3);
  expect(authMode.FULL.toJSON()).toBe("FULL");

  expect(authMode.NONE.compareTo(authMode.FULL)).toBe(-3);
  expect(authMode.FULL.compareTo(authMode.NONE)).toBe(3);
  expect(authMode.FULL.compareTo(authMode.FULL)).toBe(0);
});

test("creates GAS enum members with the observed own-property order", () => {
  const authMode = createAuthMode();

  expect(Object.getOwnPropertyNames(authMode.FULL)).toEqual([
    "toString",
    "name",
    "toJSON",
    "ordinal",
    "compareTo",
    "NONE",
    "CUSTOM_FUNCTION",
    "LIMITED",
    "FULL",
  ]);
  expect(Object.getPrototypeOf(authMode.FULL)).toBe(Object.prototype);
});

test("creates writable enumerable configurable GAS enum properties", () => {
  const authMode = createAuthMode();

  expect(Object.getOwnPropertyDescriptor(authMode.FULL, "ordinal")).toMatchObject({
    configurable: true,
    enumerable: true,
    writable: true,
  });
  expect(Object.getOwnPropertyDescriptor(authMode.FULL, "NONE")).toMatchObject({
    configurable: true,
    enumerable: true,
    writable: true,
  });
});

test("allows a representative other than the first member", () => {
  const attribute = createGasEnum({
    members: ["BACKGROUND_COLOR", "BOLD", "ITALIC"],
    representative: "BOLD",
  });

  expect(attribute).toBe(attribute.BOLD);
  expect(attribute.ordinal()).toBe(1);
  expect(String(attribute)).toBe("BOLD");

  expect(attribute.BACKGROUND_COLOR.ordinal()).toBe(0);
});
