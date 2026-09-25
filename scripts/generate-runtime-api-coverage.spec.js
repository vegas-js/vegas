import { describe, expect, test } from "vitest";

import {
  API_SURFACES,
  SHARED_API_SURFACES,
  buildRuntimeApiStatusRows,
  extractClassMethodNames,
  extractClassPropertyNames,
  extractInterfaceName,
  extractInterfaceEnumPropertyNames,
  extractInterfaceMethodNames,
  extractRuntimeGlobals,
  hasEnumDeclaration,
  isStandaloneGlobalEnum,
  mergeInterfaceMethodSurfaces,
  mergeMethodSurface,
  renderCoverageMarkdown,
  resolveRuntimeApiMethodStatus,
  runtimeApiSurfaceName,
  validateRuntimeApiStatus,
  validateRuntimeApiStatusAgainstInventory,
  validateRuntimeApiSupplement,
} from "./generate-runtime-api-coverage.js";

describe("runtime API coverage generator", () => {
  test("read Runtime global implementation status", () => {
    expect(
      extractRuntimeGlobals(`
export function createRuntimeGlobals() {
  return {
    SpreadsheetApp: createSpreadsheetApp(hostBridge),
    CalendarApp: undefined, // Not implemented yet.
    console: createConsole(loggingTarget),
  };
}
`),
    ).toStrictEqual([
      { name: "SpreadsheetApp", implemented: true },
      { name: "CalendarApp", implemented: false },
      { name: "console", implemented: true },
    ]);
  });

  test("read unique interface methods without counting properties or overloads twice", () => {
    expect(
      extractInterfaceMethodNames(
        `
declare namespace GoogleAppsScript {
  namespace Example {
    interface ExampleApp {
      Mode: typeof Mode;
      open(id: string): unknown;
      open(id: number): unknown;
      /** @deprecated DO NOT USE */ old(): void;
      flush(
        force: boolean,
      ): void;
    }
  }
}
`,
        "ExampleApp",
      ),
    ).toStrictEqual(["open", "old", "flush"]);
  });

  test("resolve interface names from optional Global Object declarations", () => {
    expect(extractInterfaceName("GoogleAppsScript.AdminDirectory | undefined")).toBe(
      "AdminDirectory",
    );
    expect(extractInterfaceName("GoogleAppsScript.Example | null | undefined")).toBe("Example");
  });

  test("read enum properties declared on an interface", () => {
    const source = `
declare namespace GoogleAppsScript {
  namespace Example {
    enum Mode {
      A,
      B,
    }
    interface ExampleApp {
      Mode: typeof Mode;
      name: string;
      open(): void;
    }
  }
}
`;

    expect(extractInterfaceEnumPropertyNames(source, "ExampleApp")).toStrictEqual(["Mode"]);
    expect(hasEnumDeclaration(source, "Mode")).toBe(true);
    expect(hasEnumDeclaration(source, "ExampleApp")).toBe(false);
  });

  test("recognize standalone Global enums with non-enum type declarations", () => {
    const declaration = {
      typeReference: "GoogleAppsScript.Base.MimeType",
      source: `
declare namespace GoogleAppsScript {
  namespace Base {
    interface MimeType {
      PDF: string;
      ZIP: string;
    }
  }
}
`,
    };

    expect(isStandaloneGlobalEnum("MimeType", declaration)).toBe(true);
    expect(isStandaloneGlobalEnum("Example", declaration)).toBe(false);
  });

  test("render service and standalone enums in one coverage section", () => {
    const output = renderCoverageMarkdown({
      version: "0.0.0",
      runtimeGlobals: [
        { name: "DriveApp", implemented: true },
        { name: "MimeType", implemented: true },
      ],
      declarations: new Map([
        [
          "DriveApp",
          {
            typeReference: "GoogleAppsScript.Drive.DriveApp",
            source: `
declare namespace GoogleAppsScript {
  namespace Drive {
    enum Access {
      ANYONE,
    }
    enum Permission {
      VIEW,
    }
    interface DriveApp {
      Access: typeof Access;
      Permission: typeof Permission;
    }
  }
}
`,
          },
        ],
        [
          "MimeType",
          {
            typeReference: "GoogleAppsScript.Base.MimeType",
            source: `
declare namespace GoogleAppsScript {
  namespace Base {
    interface MimeType {
      PDF: string;
    }
  }
}
`,
          },
        ],
      ]),
      supplement: { schemaVersion: 1, globals: {} },
      status: { schemaVersion: 1, surfaces: {} },
    });

    expect(output).toContain("Measured enum surface coverage: **3 / 3 (100.0%)**");
    expect(output).toContain("## Enums");
    expect(output.indexOf("Measured enum surface coverage")).toBeGreaterThan(
      output.indexOf("## Enums"),
    );
    expect(output.indexOf("Measured Global Object method coverage")).toBeGreaterThan(
      output.indexOf("## Global Object methods"),
    );
    expect(output).toContain("| `DriveApp` | 2 / 2 | 100.0% | — |");
    expect(output).toContain("| `MimeType` | 1 / 1 | 100.0% | — |");
    expect(output).not.toContain("Standalone Global enums");
  });

  test("merge supplemental methods without duplicating declared methods", () => {
    expect(mergeMethodSurface(["open", "flush"], ["flush", "enableLookerExecution"])).toStrictEqual(
      ["open", "flush", "enableLookerExecution"],
    );
  });

  test("merge shared Runtime object interface methods without duplicates", () => {
    expect(
      mergeInterfaceMethodSurfaces(
        `
interface Blob extends BlobSource {
  copyBlob(): Blob;
  getAs(contentType: string): Blob;
}
interface BlobSource {
  getAs(contentType: string): Blob;
  getBlob(): Blob;
}
`,
        ["Blob", "BlobSource"],
      ),
    ).toStrictEqual(["copyBlob", "getAs", "getBlob"]);
  });

  test("render shared Runtime object coverage", () => {
    const output = renderCoverageMarkdown({
      version: "0.0.0",
      runtimeGlobals: [],
      declarations: new Map(),
      supplement: { schemaVersion: 1, globals: {} },
      status: { schemaVersion: 1, surfaces: {} },
      typeSources: new Map([
        [
          "google-apps-script.base.d.ts",
          `
interface Blob extends BlobSource {
  copyBlob(): Blob;
}
interface BlobSource {
  getAs(contentType: string): Blob;
  getBlob(): Blob;
}
`,
        ],
      ]),
    });

    expect(output).toContain("::: details Shared");
    expect(output).toContain("| `Blob` | 3 / 3 | 100.0% | — |");
  });

  test("validate supplemental Runtime API declarations", () => {
    expect(() =>
      validateRuntimeApiSupplement({
        schemaVersion: 1,
        globals: {
          SpreadsheetApp: {
            mode: "augment",
            source:
              "https://developers.google.com/apps-script/reference/spreadsheet/spreadsheet-app",
            methods: ["enableLookerExecution"],
          },
        },
      }),
    ).not.toThrow();

    expect(() =>
      validateRuntimeApiSupplement({
        schemaVersion: 1,
        globals: {
          SpreadsheetApp: {
            mode: "augment",
            source: "https://example.com/spreadsheet-app",
            methods: ["enableLookerExecution"],
          },
        },
      }),
    ).toThrow("must use Google official docs");
  });

  test("validate Runtime API behavior status independently from contract verification", () => {
    expect(() =>
      validateRuntimeApiStatus({
        schemaVersion: 1,
        surfaces: {
          "SpreadsheetApp.Range": {
            auditedMethods: ["getValue", "canEdit", "flush", "getAs"],
            defaultBehavior: "implemented",
            behaviorOverrides: {
              canEdit: "local-emulation",
              flush: "no-op",
              getAs: "fail-closed",
            },
            contractTestedMethods: ["getAs"],
          },
        },
      }),
    ).not.toThrow();

    expect(() =>
      validateRuntimeApiStatus({
        schemaVersion: 1,
        surfaces: {
          "SpreadsheetApp.Range": {
            auditedMethods: ["getValue"],
            defaultBehavior: "best-effort",
          },
        },
      }),
    ).toThrow("Invalid Runtime API behavior");

    expect(() =>
      validateRuntimeApiStatus({
        schemaVersion: 1,
        surfaces: {
          "SpreadsheetApp.Range": {
            auditedMethods: ["getValue"],
            contractTestedMethods: ["getValue", "getValue"],
          },
        },
      }),
    ).toThrow("Duplicate Runtime API contract-tested methods");
  });

  test("resolve method behavior and contract verification as separate dimensions", () => {
    const surface = {
      auditedMethods: ["getValue", "canEdit", "getAs"],
      defaultBehavior: "implemented",
      behaviorOverrides: {
        canEdit: "local-emulation",
        getAs: "fail-closed",
      },
      contractTestedMethods: ["getAs"],
    };

    expect(resolveRuntimeApiMethodStatus(surface, "getValue")).toStrictEqual({
      behavior: "implemented",
      contractTested: false,
    });
    expect(resolveRuntimeApiMethodStatus(surface, "canEdit")).toStrictEqual({
      behavior: "local-emulation",
      contractTested: false,
    });
    expect(resolveRuntimeApiMethodStatus(surface, "getAs")).toStrictEqual({
      behavior: "fail-closed",
      contractTested: true,
    });
    expect(resolveRuntimeApiMethodStatus(undefined, "missing")).toStrictEqual({
      behavior: null,
      contractTested: false,
    });
  });

  test("summarize audited Runtime behavior separately from contract verification", () => {
    expect(
      buildRuntimeApiStatusRows({
        schemaVersion: 1,
        surfaces: {
          "SpreadsheetApp.Range": {
            auditedMethods: ["getValue", "canEdit", "flush", "getAs"],
            defaultBehavior: "implemented",
            behaviorOverrides: {
              canEdit: "local-emulation",
              flush: "no-op",
              getAs: "fail-closed",
            },
            contractTestedMethods: ["getAs"],
          },
        },
      }),
    ).toStrictEqual([
      {
        name: "SpreadsheetApp.Range",
        audited: 4,
        behavior: "`implemented`: 1<br>`local-emulation`: 1<br>`no-op`: 1<br>`fail-closed`: 1",
        contractTested: 1,
      },
    ]);
  });

  test("reject status entries that reference methods outside the audited surface", () => {
    expect(() =>
      validateRuntimeApiStatus({
        schemaVersion: 1,
        surfaces: {
          PropertiesService: {
            auditedMethods: ["getScriptProperties"],
            defaultBehavior: "local-emulation",
            behaviorOverrides: {
              getUserProperties: "local-emulation",
            },
          },
        },
      }),
    ).toThrow("is not audited");
  });

  test("name top-level and nested Runtime API surfaces consistently", () => {
    expect(runtimeApiSurfaceName("PropertiesService", "PropertiesService")).toBe(
      "PropertiesService",
    );
    expect(runtimeApiSurfaceName("console", "Console")).toBe("console");
    expect(runtimeApiSurfaceName("PropertiesService", "Properties")).toBe(
      "PropertiesService.Properties",
    );
  });

  test("reject Runtime implementation drift from an audited status surface", () => {
    const status = {
      schemaVersion: 1,
      surfaces: {
        PropertiesService: {
          auditedMethods: ["getScriptProperties", "getUserProperties"],
          defaultBehavior: "local-emulation",
        },
      },
    };

    expect(() =>
      validateRuntimeApiStatusAgainstInventory(status, {
        PropertiesService: ["getScriptProperties", "getUserProperties"],
      }),
    ).not.toThrow();

    expect(() =>
      validateRuntimeApiStatusAgainstInventory(status, {
        PropertiesService: ["getDocumentProperties", "getScriptProperties", "getUserProperties"],
      }),
    ).toThrow("missing implemented methods: getDocumentProperties");

    expect(() =>
      validateRuntimeApiStatusAgainstInventory(status, {
        "PropertiesService.Properties": ["getScriptProperties", "getUserProperties"],
      }),
    ).toThrow("Unknown Runtime API status surface");

    expect(() =>
      validateRuntimeApiStatusAgainstInventory(status, {
        PropertiesService: ["getScriptProperties", "getUserProperties"],
        "PropertiesService.Properties": ["get", "set"],
      }),
    ).toThrow("missing modeled surface: PropertiesService.Properties");
  });

  test("track modeled HtmlService Runtime objects", () => {
    expect(API_SURFACES.HtmlService).toContainEqual([
      "HtmlTemplate",
      "html-template.ts",
      "HtmlTemplate",
    ]);
    expect(API_SURFACES.HtmlService).toContainEqual([
      "HtmlOutputMetaTag",
      "html-output.ts",
      "HtmlOutputMetaTag",
    ]);
  });

  test("track shared Runtime objects independently from Global Objects", () => {
    expect(SHARED_API_SURFACES).toContainEqual({
      name: "Blob",
      declarationPath: "google-apps-script.base.d.ts",
      interfaceNames: ["Blob", "BlobSource"],
      relativePath: "blob.ts",
      className: "RuntimeBlob",
    });
  });

  test("read unique public Runtime class methods", () => {
    expect(
      extractClassMethodNames(
        `
export class ExampleApp {
  readonly #value = 1;

  constructor() {}

  open(id: string): void;
  open(id: number): void;
  open(id: string | number): void {
    void id;
  }

  flush(): void {}

  #internal(): void {}
}
`,
        "ExampleApp",
      ),
    ).toStrictEqual(["open", "flush"]);
  });

  test("read public Runtime class properties", () => {
    expect(
      extractClassPropertyNames(
        `
export class ExampleApp {
  readonly Mode = MODE;
  value = 1;
  readonly #hidden = 2;

  open(): void {}
}
`,
        "ExampleApp",
      ),
    ).toStrictEqual(["Mode", "value"]);
  });
});
