import { describe, expect, test } from "vitest";

import { RuntimeDataTarget } from "../../shared/gas";
import { validateRuntimeDataModule } from "./validation";

describe("validateRuntimeDataModule", () => {
  test("reject Cache runtime data until fixture support is implemented", () => {
    expect(() =>
      validateRuntimeDataModule(
        {
          target: RuntimeDataTarget.Cache,
        },
        "runtime/cache.ts",
      ),
    ).toThrow("Runtime data target Cache is not implemented: runtime/cache.ts");
  });
});
