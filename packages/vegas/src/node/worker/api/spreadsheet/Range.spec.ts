import { describe, expect, test } from "vitest";

import { ServiceCaller } from "../../../runtime/protocol";
import { Range } from "./Range";

describe("getCell", () => {
  test("check argument boundaries", () => {
    const callService: ServiceCaller = () => {
      throw new Error("unexpected service call");
    };
    const range = new Range("", 0, 1, 1, 100, 100, callService);

    // minimum boundaries
    expect(() => range.getCell(1, 1)).not.toThrow();
    expect(() => range.getCell(1, 0)).toThrow();
    expect(() => range.getCell(0, 1)).toThrow();

    // maximum boundaries
    expect(() => range.getCell(100, 100)).not.toThrow();
    expect(() => range.getCell(101, 100)).toThrow();
    expect(() => range.getCell(100, 101)).toThrow();
  });
});
