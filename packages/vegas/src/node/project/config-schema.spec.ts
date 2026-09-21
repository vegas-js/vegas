import { expectTypeOf, test } from "vitest";

import type { UserConfig } from "../../shared/config";
import type { UserConfigSchemaOutput } from "./config-schema";

test("config schema matches public UserConfig type", () => {
  expectTypeOf<UserConfigSchemaOutput>().toExtend<UserConfig>();
  expectTypeOf<UserConfig>().toExtend<UserConfigSchemaOutput>();
});
