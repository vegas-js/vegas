import { describe, expectTypeOf, test } from "vitest";

import { type DriveFileReference, type DriveHostCall, type HostCallResult } from "./index";

describe("Drive host call result types", () => {
  test("map Drive host calls to operation-specific result types", () => {
    const fileCall = {
      service: "drive",
      operation: "get-file",
      id: "file-id",
    } satisfies DriveHostCall;
    const hasNextCall = {
      service: "drive",
      operation: "iterator-has-next",
      iterator: {
        service: "drive",
        kind: "file-iterator",
        handle: "files",
      },
    } satisfies DriveHostCall;
    const tokenCall = {
      service: "drive",
      operation: "iterator-continuation-token",
      iterator: {
        service: "drive",
        kind: "folder-iterator",
        handle: "folders",
      },
    } satisfies DriveHostCall;

    expectTypeOf<HostCallResult<typeof fileCall>>().toEqualTypeOf<DriveFileReference>();
    expectTypeOf<HostCallResult<typeof hasNextCall>>().toEqualTypeOf<boolean>();
    expectTypeOf<HostCallResult<typeof tokenCall>>().toEqualTypeOf<string>();
  });
});
