import vm from "node:vm";

import { describe, expect, test, vi } from "vitest";

import { executeRuntimeFunction } from "./function-execution";

describe("Runtime function lookup", () => {
  test("executes own function properties, including functions defined in a worker VM", async () => {
    const context = vm.createContext({});
    new vm.Script('function greet(name) { return "Hello, " + name; }').runInContext(context);

    await expect(executeRuntimeFunction(context, "greet", ["Vegas"])).resolves.toBe("Hello, Vegas");

    const globals = Object.defineProperty({}, "ownFunction", {
      value: (name: string) => `Hello, ${name}`,
    });
    await expect(executeRuntimeFunction(globals, "ownFunction", ["Vegas"])).resolves.toBe(
      "Hello, Vegas",
    );
  });

  test("rejects inherited functions and Object prototype methods", async () => {
    const globals = Object.create({
      greet() {
        return "inherited";
      },
    }) as Record<string, unknown>;

    for (const name of ["greet", "constructor", "toString"]) {
      await expect(executeRuntimeFunction(globals, name, [])).rejects.toThrow(
        `${name} is not a function`,
      );
    }
  });

  test("does not evaluate getters while resolving global functions", async () => {
    const getter = vi.fn(() => () => "unsafe");
    const globals = Object.defineProperty({}, "unsafe", { get: getter });

    await expect(executeRuntimeFunction(globals, "unsafe", [])).rejects.toThrow(
      "unsafe is not a function",
    );
    expect(getter).not.toHaveBeenCalled();
  });
});
