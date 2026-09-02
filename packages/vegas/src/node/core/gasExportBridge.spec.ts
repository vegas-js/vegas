import { expect, test } from "vitest";

import { appendGasExportBridge } from "./gasExportBridge";

test("appends GAS function bridges to entry chunks", () => {
  const bundle = {
    "Code.js": {
      type: "chunk" as const,
      isEntry: true,
      exports: ["doGet", "doPost"],
      code: "const source = true;",
    },
  };
  appendGasExportBridge(
    {
      name: "Server",
    },
    bundle,
  );

  expect(bundle["Code.js"].code).toContain("\n/* Function bridge for GAS Client */");
  expect(bundle["Code.js"].code).toContain(
    "function doGet(...args) { return Server.doGet(...args); };",
  );
  expect(bundle["Code.js"].code).toContain(
    "function doPost(...args) { return Server.doPost(...args); };",
  );
});

test("uses globalThis when output name is not defined", () => {
  const bundle = {
    "Code.js": {
      type: "chunk" as const,
      isEntry: true,
      exports: ["doGet"],
      code: "const source = true;",
    },
  };
  appendGasExportBridge({}, bundle);

  expect(bundle["Code.js"].code).toContain(
    "function doGet(...args) { return globalThis.doGet(...args); };",
  );
});

test("does not modify non-entry chunks or assets", () => {
  const bundle = {
    "shared.js": {
      type: "chunk" as const,
      isEntry: false,
      exports: ["shared"],
      code: "const shared = true;",
    },
    "index.html": {
      type: "asset" as const,
    },
  };
  appendGasExportBridge(
    {
      name: "Server",
    },
    bundle,
  );

  expect(bundle["shared.js"].code).toBe("const shared = true;");
  expect(bundle["index.html"]).toEqual({
    type: "asset",
  });
});

test("does not modify entry chunks without exports", () => {
  const bundle = {
    "Code.js": {
      type: "chunk" as const,
      isEntry: true,
      exports: [],
      code: "const source = true;",
    },
  };
  appendGasExportBridge(
    {
      name: "Server",
    },
    bundle,
  );

  expect(bundle["Code.js"].code).toBe("const source = true;");
});
