import { describe, expect, test } from "vitest";

import { createBlob } from "./blob";
import { convertBlob, createBlobConverter } from "./blob-converter";
import type { HostBridge } from "./host-bridge";

describe("Blob conversion", () => {
  test("route conversion through the HostBridge", () => {
    const calls: unknown[] = [];
    const hostBridge = {
      call(call: {
        readonly service: "blob";
        readonly operation: "convert";
        readonly value: {
          readonly bytes: readonly number[];
          readonly contentType: string | null;
          readonly name: string | null;
          readonly googleType: boolean;
        };
        readonly contentType: string;
      }) {
        calls.push(call);

        return {
          ...call.value,
          bytes: [80, 68, 70],
          contentType: call.contentType,
        };
      },
    } as unknown as HostBridge;
    const convert = createBlobConverter(hostBridge);
    const blob = createBlob("Vegas", "text/plain", "vegas.txt");

    expect(convertBlob(blob, "application/pdf", convert).getBytes()).toStrictEqual([80, 68, 70]);
    expect(calls).toStrictEqual([
      {
        service: "blob",
        operation: "convert",
        value: {
          bytes: [86, 101, 103, 97, 115],
          contentType: "text/plain",
          name: "vegas.txt",
          googleType: false,
        },
        contentType: "application/pdf",
      },
    ]);
  });
});
