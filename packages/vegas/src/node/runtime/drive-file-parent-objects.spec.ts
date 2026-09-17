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
          ...(call.resourceKey ? { resourceKey: call.resourceKey } : {}),
        } as unknown as HostCallResult<C>;
      case "get-folder":
        return {
          service: "drive",
          kind: "folder",
          id: call.id,
          ...(call.resourceKey ? { resourceKey: call.resourceKey } : {}),
        } as unknown as HostCallResult<C>;
      case "move-file":
        return undefined as unknown as HostCallResult<C>;
      default:
        throw new Error(`unexpected Drive operation: ${call.operation}`);
    }
  }
}

describe("DriveFile parent mutation Runtime surface", () => {
  test("map move-file to a void host result", () => {
    const call = {
      service: "drive",
      operation: "move-file",
      file: {
        service: "drive",
        kind: "file",
        id: "file-1",
      },
      destination: {
        service: "drive",
        kind: "folder",
        id: "folder-1",
        resourceKey: "folder-key",
      },
    } satisfies DriveHostCall;

    expectTypeOf<HostCallResult<typeof call>>().toEqualTypeOf<void>();
  });

  test("preserve the destination reference and return the same File for chaining", () => {
    const bridge = new RecordingHostBridge();
    const drive = createDriveApp(bridge);
    const file = drive.getFileById("file-1");
    const destination = drive.getFolderByIdAndResourceKey("folder-1", "folder-key");

    expect(file.moveTo(destination)).toBe(file);

    expect(bridge.calls).toStrictEqual([
      {
        service: "drive",
        operation: "get-file",
        id: "file-1",
      },
      {
        service: "drive",
        operation: "get-folder",
        id: "folder-1",
        resourceKey: "folder-key",
      },
      {
        service: "drive",
        operation: "move-file",
        file: {
          service: "drive",
          kind: "file",
          id: "file-1",
        },
        destination: {
          service: "drive",
          kind: "folder",
          id: "folder-1",
          resourceKey: "folder-key",
        },
      },
    ]);
  });

  test("reject a Folder from another HostBridge", () => {
    const bridge = new RecordingHostBridge();
    const file = createDriveApp(bridge).getFileById("file-1");
    const foreignFolder = createDriveApp(new RecordingHostBridge()).getFolderById("folder-1");

    expect(() => file.moveTo(foreignFolder)).toThrow(
      "Drive folder does not belong to this Runtime Drive.",
    );
  });
});
