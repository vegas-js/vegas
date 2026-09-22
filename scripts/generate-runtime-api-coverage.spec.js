import { describe, expect, test } from "vitest";

import {
  API_SURFACES,
  extractClassMethodNames,
  extractClassPropertyNames,
  extractInterfaceName,
  extractInterfaceEnumPropertyNames,
  extractInterfaceMethodNames,
  extractRuntimeGlobals,
  hasEnumDeclaration,
  isStandaloneGlobalEnum,
  mergeMethodSurface,
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

  test("merge supplemental methods without duplicating declared methods", () => {
    expect(mergeMethodSurface(["open", "flush"], ["flush", "enableLookerExecution"])).toStrictEqual(
      ["open", "flush", "enableLookerExecution"],
    );
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

  test("validate Runtime API behavior status independently from conformance", () => {
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
            conformanceTestedMethods: ["getAs"],
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
            conformanceTestedMethods: ["getValue", "getValue"],
          },
        },
      }),
    ).toThrow("Duplicate Runtime API conformance methods");
  });

  test("resolve method behavior and conformance as separate dimensions", () => {
    const surface = {
      auditedMethods: ["getValue", "canEdit", "getAs"],
      defaultBehavior: "implemented",
      behaviorOverrides: {
        canEdit: "local-emulation",
        getAs: "fail-closed",
      },
      conformanceTestedMethods: ["getAs"],
    };

    expect(resolveRuntimeApiMethodStatus(surface, "getValue")).toStrictEqual({
      behavior: "implemented",
      conformanceTested: false,
    });
    expect(resolveRuntimeApiMethodStatus(surface, "canEdit")).toStrictEqual({
      behavior: "local-emulation",
      conformanceTested: false,
    });
    expect(resolveRuntimeApiMethodStatus(surface, "getAs")).toStrictEqual({
      behavior: "fail-closed",
      conformanceTested: true,
    });
    expect(resolveRuntimeApiMethodStatus(undefined, "missing")).toStrictEqual({
      behavior: null,
      conformanceTested: false,
    });
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
  });

  test("track HtmlTemplate as a modeled HtmlService Runtime object", () => {
    expect(API_SURFACES.HtmlService).toContainEqual([
      "HtmlTemplate",
      "html-template.ts",
      "HtmlTemplate",
    ]);
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
