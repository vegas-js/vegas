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
