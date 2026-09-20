import { describe, expect, test } from "vitest";

import { NodeBlobConversionCapability } from "./blob-conversion-capability";

describe("NodeBlobConversionCapability", () => {
  test("fail closed when Node cannot faithfully reproduce Apps Script conversion", async () => {
    const capability = new NodeBlobConversionCapability();

    await expect(
      capability.convert(
        {
          bytes: [60, 112, 62, 86, 101, 103, 97, 115, 60, 47, 112, 62],
          contentType: "text/html",
          name: null,
          googleType: false,
        },
        "application/pdf",
      ),
    ).rejects.toThrow(
      "Node Blob conversion cannot faithfully convert text/html to application/pdf.",
    );
  });
});
