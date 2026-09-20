import { describe, expect, test } from "vitest";

import type { BlobConverter } from "./blob-converter";
import { createHtmlTemplateOutput } from "./html-template-output";

describe("createHtmlTemplateOutput", () => {
  test("preserve Blob conversion on evaluated template output", () => {
    const convert: BlobConverter = (value, contentType) => ({
      ...value,
      bytes: [80, 68, 70],
      contentType,
    });
    const sink = createHtmlTemplateOutput(false, undefined, convert);

    sink.raw = "<main>Vegas</main>";

    expect(sink.finish().getAs("application/pdf").getBytes()).toStrictEqual([80, 68, 70]);
  });
});
