import { describe, expect, test } from "vitest";

import {
  extractClassMethodNames,
  extractClassPropertyNames,
  extractInterfaceName,
  extractInterfaceEnumPropertyNames,
  extractInterfaceMethodNames,
  extractRuntimeGlobals,
  hasEnumDeclaration,
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
