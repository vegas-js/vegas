import { describe, expect, expectTypeOf, test } from "vitest";

import {
  createDriveApp,
  type DriveHostCall,
  type HostBridge,
  type HostCall,
  type HostCallResult,
} from "./index";

class RecordingHostBridge implements HostBridge {
  readonly calls: HostCall[] = [];

  call<C extends HostCall>(call: C): HostCallResult<C> {
    this.calls.push(call);

    if (call.service !== "drive") {
      throw new Error("unexpected host service");
    }

    switch (call.operation) {
      case "get-file":
        return {
          service: "drive",
          kind: "file",
          id: call.id,
        } as HostCallResult<C>;
      case "get-file-name":
        return "hello.txt" as unknown as HostCallResult<C>;
      case "get-file-mime-type":
        return "text/plain" as unknown as HostCallResult<C>;
      default:
        throw new Error(`unexpected Drive operation: ${call.operation}`);
    }
  }
}

describe("DriveFile metadata Runtime surface", () => {
  test("map file metadata calls to string results", () => {
    const getNameCall = {
      service: "drive",
      operation: "get-file-name",
      file: {
        service: "drive",
        kind: "file",
        id: "file-1",
      },
    } satisfies DriveHostCall;
    const getMimeTypeCall = {
      service: "drive",
      operation: "get-file-mime-type",
      file: {
        service: "drive",
        kind: "file",
        id: "file-1",
      },
    } satisfies DriveHostCall;

    expectTypeOf<HostCallResult<typeof getNameCall>>().toEqualTypeOf<string>();
    expectTypeOf<HostCallResult<typeof getMimeTypeCall>>().toEqualTypeOf<string>();
  });

  test("route File.getName() and File.getMimeType() through semantic host calls", () => {
    const bridge = new RecordingHostBridge();
    const file = createDriveApp(bridge).getFileById("file-1");

    expect(file.getName()).toBe("hello.txt");
    expect(file.getMimeType()).toBe("text/plain");

    expect(bridge.calls).toStrictEqual([
      {
        service: "drive",
        operation: "get-file",
        id: "file-1",
      },
      {
        service: "drive",
        operation: "get-file-name",
        file: {
          service: "drive",
          kind: "file",
          id: "file-1",
        },
      },
      {
        service: "drive",
        operation: "get-file-mime-type",
        file: {
          service: "drive",
          kind: "file",
          id: "file-1",
        },
      },
    ]);
  });
});
