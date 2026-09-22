import { expect, expectTypeOf, test } from "vitest";

import {
  createLocalRuntimeTest,
  type LocalRuntimeProject,
  type LocalRuntimeTestOptions,
  type Program,
  type RuntimeDataFixture,
} from "./vitest";

test("expose the Vitest Local Runtime surface", () => {
  expect(typeof createLocalRuntimeTest).toBe("function");

  expectTypeOf<LocalRuntimeTestOptions["project"]>().toEqualTypeOf<LocalRuntimeProject>();
  expectTypeOf<LocalRuntimeTestOptions["runtimeData"]>().toEqualTypeOf<
    RuntimeDataFixture | undefined
  >();
  expectTypeOf<LocalRuntimeTestOptions["program"]>().toEqualTypeOf<Program>();
});
