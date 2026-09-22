import { expect, expectTypeOf, test } from "vitest";

import {
  createLocalRuntimeTest,
  type LocalRuntimeHarnessOptions,
  type LocalRuntimeProject,
  type Program,
  type RuntimeDataSnapshot,
} from "./vitest";

test("expose the Vitest Local Runtime surface", () => {
  expect(typeof createLocalRuntimeTest).toBe("function");

  expectTypeOf<LocalRuntimeHarnessOptions["project"]>().toEqualTypeOf<LocalRuntimeProject>();
  expectTypeOf<LocalRuntimeHarnessOptions["snapshot"]>().toEqualTypeOf<RuntimeDataSnapshot>();
  expectTypeOf<LocalRuntimeHarnessOptions["program"]>().toEqualTypeOf<Program>();
});
