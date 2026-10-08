import { describe, expect, test } from "vitest";

import * as server from "./server";

describe("public server API", () => {
  test("does not expose the generated RPC dispatcher", () => {
    expect("__vegasInternalRpcDispatch" in server).toBe(false);
  });
});
