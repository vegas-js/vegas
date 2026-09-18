import { describe, expect, test, vi } from "vitest";

import { Utilities } from "./utilities";
import type { UtilitiesCapability } from "./utilities-capability";

describe("Utilities.sleep", () => {
  test("delegate synchronous waiting to the Runtime capability after validating the duration", () => {
    const sleep = vi.fn();
    const utilities = new Utilities({ sleep } as unknown as UtilitiesCapability);

    expect(utilities.sleep(25)).toBeUndefined();
    expect(sleep).toHaveBeenCalledOnce();
    expect(sleep).toHaveBeenCalledWith(25);

    expect(() => utilities.sleep(300_001)).toThrow("Sleep duration exceeds 300000 milliseconds.");
    expect(sleep).toHaveBeenCalledOnce();
  });
});
