import { describe, expect, test } from "vitest";

import { UnsupportedRuntimeOperationError } from "../unsupported-runtime-operation-error";
import { NodeBlobConversionCapability } from "./blob-conversion-capability";

describe("NodeBlobConversionCapability", () => {
  test("fail closed when Node cannot faithfully reproduce Apps Script conversion", async () => {
    const capability = new NodeBlobConversionCapability();

    const conversion = capability.convert(
      {
        bytes: [60, 112, 62, 86, 101, 103, 97, 115, 60, 47, 112, 62],
        contentType: "text/html",
        name: null,
        googleType: false,
      },
      "application/pdf",
    );

    await expect(conversion).rejects.toBeInstanceOf(UnsupportedRuntimeOperationError);
    await expect(conversion).rejects.toThrow(
      "Local Runtime does not support Blob conversion: Node cannot faithfully convert text/html to application/pdf.",
    );
  });
});
