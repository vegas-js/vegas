import { expect, expectTypeOf, test } from "vitest";

import {
  createLocalRuntimeTest,
  type LocalRuntimeTestOptions,
  type RuntimeDataFixture,
} from "./vitest";

test("expose the Vitest Local Runtime surface", () => {
  expect(typeof createLocalRuntimeTest).toBe("function");

  expectTypeOf<LocalRuntimeTestOptions["root"]>().toEqualTypeOf<string | undefined>();
  expectTypeOf<LocalRuntimeTestOptions["runtimeData"]>().toEqualTypeOf<
    RuntimeDataFixture | undefined
  >();
});
