import { test as baseTest } from "vitest";

import {
  createLocalRuntimeHarness,
  type LocalRuntimeHarnessOptions,
} from "../local-runtime-harness";

export function createLocalRuntimeTest(options: LocalRuntimeHarnessOptions) {
  return baseTest.extend("vegas", () => createLocalRuntimeHarness(options));
}
