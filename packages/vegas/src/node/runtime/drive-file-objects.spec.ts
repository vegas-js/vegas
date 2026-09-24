import { describe, expect, expectTypeOf, test } from "vitest";

import {
  createBlob,
  createDriveApp,
  DriveFile,
  RuntimeBlob,
  type BlobValue,
  type DriveFileReference,
  type DriveHostCall,
  type HostBridge,
  type HostCall,
  type HostCallResult,
} from "./index";

class RecordingHostBridge implements HostBridge {
  readonly calls: HostCall[] = [];

  call<C extends HostCall>(call: C): HostCallResult<C> {
    this.calls.push(call);

    if (call.service === "blob") {
      return {
        ...call.value,
        bytes: [80, 68, 70],
        contentType: call.contentType,
      } as unknown as HostCallResult<C>;
    }

    if (call.service !== "drive") {
      throw new Error("unexpected host service");
    }

    switch (call.operation) {
      case "get-root-folder":
        return {
          service: "drive",
          kind: "folder",
          id: "root",
        } as HostCallResult<C>;
      case "create-file":
        return {
          service: "drive",
          kind: "file",
          id: "file-1",
        } as HostCallResult<C>;
      case "get-file-blob":
        return {
          bytes: [104, 101, 108, 108, 111],
          contentType: "text/plain",
          name: "hello.txt",
          googleType: false,
        } as unknown as HostCallResult<C>;
      case "set-file-content":
        return undefined as unknown as HostCallResult<C>;
      default:
        throw new Error(`unexpected Drive operation: ${call.operation}`);
    }
  }
}

describe("DriveFile Runtime object", () => {
  test("expose resource keys from Drive references without a host call", () => {
    const bridge = new RecordingHostBridge();
    const file = new DriveFile(
      bridge,
      {
        service: "drive",
        kind: "file",
        id: "file-1",
        resourceKey: "resource-key",
      },
      {
        hydrate() {
          throw new Error("unexpected Drive object hydration");
        },
      },
    );
    const fileWithoutResourceKey = new DriveFile(
      bridge,
      {
        service: "drive",
        kind: "file",
        id: "file-2",
      },
      {
        hydrate() {
          throw new Error("unexpected Drive object hydration");
        },
      },
    );

    expect(file.getResourceKey()).toBe("resource-key");
    expect(fileWithoutResourceKey.getResourceKey()).toBeNull();
    expect(bridge.calls).toStrictEqual([]);
  });

  test("map file Blob calls to operation-specific result types", () => {
    const createCall = {
      service: "drive",
      operation: "create-file",
      parent: {
        service: "drive",
        kind: "folder",
        id: "root",
      },
      blob: {
        bytes: [65],
        contentType: "text/plain",
        name: "a.txt",
        googleType: false,
      },
    } satisfies DriveHostCall;
    const setContentCall = {
      service: "drive",
      operation: "set-file-content",
      file: {
        service: "drive",
        kind: "file",
        id: "file-1",
      },
      content: "updated",
    } satisfies DriveHostCall;
    const getBlobCall = {
      service: "drive",
      operation: "get-file-blob",
      file: {
        service: "drive",
        kind: "file",
        id: "file-1",
      },
    } satisfies DriveHostCall;

    expectTypeOf<HostCallResult<typeof createCall>>().toEqualTypeOf<DriveFileReference>();
    expectTypeOf<HostCallResult<typeof setContentCall>>().toEqualTypeOf<void>();
    expectTypeOf<HostCallResult<typeof getBlobCall>>().toEqualTypeOf<BlobValue>();
  });

  test("serialize RuntimeBlob across the host boundary and hydrate File.getBlob()", () => {
    const bridge = new RecordingHostBridge();
    const source = createBlob("hello", "text/plain", "hello.txt");
    const file = createDriveApp(bridge).getRootFolder().createFile(source);

    source.setDataFromString("changed");

    expect(file).toBeInstanceOf(DriveFile);
    expect(file.getId()).toBe("file-1");

    const blob = file.getBlob();

    expect(blob).toBeInstanceOf(RuntimeBlob);
    expect(blob.getDataAsString()).toBe("hello");
    expect(blob.getContentType()).toBe("text/plain");
    expect(blob.getName()).toBe("hello.txt");
    const convertedBlob = blob.getAs("application/pdf");
    expect(convertedBlob.getBytes()).toStrictEqual([80, 68, 70]);
    expect(convertedBlob.getContentType()).toBe("application/pdf");
    expect(file.setContent("updated")).toBe(file);

    expect(bridge.calls).toStrictEqual([
      {
        service: "drive",
        operation: "get-root-folder",
      },
      {
        service: "drive",
        operation: "create-file",
        parent: {
          service: "drive",
          kind: "folder",
          id: "root",
        },
        blob: {
          bytes: [104, 101, 108, 108, 111],
          contentType: "text/plain",
          name: "hello.txt",
          googleType: false,
        },
      },
      {
        service: "drive",
        operation: "get-file-blob",
        file: {
          service: "drive",
          kind: "file",
          id: "file-1",
        },
      },
      {
        service: "blob",
        operation: "convert",
        value: {
          bytes: [104, 101, 108, 108, 111],
          contentType: "text/plain",
          name: "hello.txt",
          googleType: false,
        },
        contentType: "application/pdf",
      },
      {
        service: "drive",
        operation: "set-file-content",
        file: {
          service: "drive",
          kind: "file",
          id: "file-1",
        },
        content: "updated",
      },
    ]);
  });
});
