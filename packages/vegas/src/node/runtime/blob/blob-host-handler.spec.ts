import { describe, expect, test } from "vitest";

import type { BlobHostCall } from "./blob-host-call";
import { BlobHostHandler } from "./blob-host-handler";

describe("BlobHostHandler", () => {
  test("convert blobs through the configured capability", async () => {
    const handler = new BlobHostHandler({
      async convert(value, contentType) {
        return {
          ...value,
          contentType,
        };
      },
    });

    await expect(
      handler.handle({
        service: "blob",
        operation: "convert",
        value: {
          bytes: [79, 75],
          contentType: "text/plain",
          name: "message.txt",
          googleType: false,
        },
        contentType: "application/octet-stream",
      }),
    ).resolves.toStrictEqual({
      bytes: [79, 75],
      contentType: "application/octet-stream",
      name: "message.txt",
      googleType: false,
    });
  });

  test("reject unknown operations as host protocol drift", async () => {
    const handler = new BlobHostHandler({
      async convert() {
        throw new Error("Blob conversion should not run.");
      },
    });
    const call = {
      service: "blob",
      operation: "unknown",
    } as unknown as BlobHostCall;

    await expect(handler.handle(call)).rejects.toMatchObject({
      name: "RuntimeInfrastructureError",
      kind: "protocol",
      message: "Unsupported host call: blob#unknown",
    });
  });
});
