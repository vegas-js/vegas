import { expect, test } from "vitest";

import * as execution from "./index";

test("exposes only the canonical script runtime constructor", () => {
  expect(Object.keys(execution)).toEqual(["createScriptRuntime"]);
});
