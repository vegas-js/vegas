import { expect, test } from "vitest";

import { createMimeType } from "./mimeType";

test("creates a fresh MimeType object", () => {
  expect(createMimeType()).not.toBe(createMimeType());
});

test("creates representative MimeType constants", () => {
  const mimeType = createMimeType();

  expect(String(mimeType)).toBe("MimeType");
  expect(mimeType.PDF).toBe("application/pdf");
  expect(mimeType.GOOGLE_SHEETS).toBe("application/vnd.google-apps.spreadsheet");
});
