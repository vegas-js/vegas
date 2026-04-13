import { describe, expect, test, vi } from "vitest";

import { HtmlService } from "../html/HtmlService";
import { Console } from "./console";

describe("direct output", () => {
  test("with prefix", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log();
    const args = consoleMock.mock.lastCall;
    expect(args?.[0]).toMatch(/ console\(GAS\)   \d{2}:\d{2}:\d{2}  Info      /);
  });

  test("empty line", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log();
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("");
  });

  describe("boolean", () => {
    test("true", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();
      gasConsole.log(true);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("true");
    });

    test("false", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();
      gasConsole.log(false);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("false");
    });
  });

  describe("number", () => {
    test("decimal", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();
      gasConsole.log(0);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("0");
    });

    test("replace any digits with 0 if they exceed 18", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();
      // oxlint-disable-next-line no-loss-of-precision
      gasConsole.log(12345678901234567890);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("12345678901234567000");
    });

    test("with 18 or more decimal places are truncated", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();
      // oxlint-disable-next-line no-loss-of-precision
      gasConsole.log(3.14159265358979323846);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("3.141592653589793");
    });

    test("Infinity", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();
      gasConsole.log(Infinity);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("Infinity");
    });

    test("NaN", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();
      gasConsole.log(NaN);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("NaN");
    });
  });

  test("empty string", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("");
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("");
  });

  test("string", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("Hello, world!");
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("Hello, world!");
  });

  test("symbol", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log(Symbol.for("sym"));
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("{}");
  });

  test("null", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log(null);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("null");
  });

  test("undefined", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log(undefined);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("undefined");
  });

  test("{}", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log({});
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("{}");
  });

  test("{} with properties", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log({ a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7, i: 8, j: 9, k: 0 });
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("{ a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7, i: 8, j: 9, k: 0 }");
  });

  test("{} with message property", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log({ message: "object message" });
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("{ message: 'object message' }");
  });

  test("{} with toString property", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log({ toString: () => "object toString" });
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("{ toString: [Function: toString] }");
  });

  test("{} with message and toString property", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log({ message: "object message", toString: () => "object toString" });
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("{ message: 'object message', toString: [Function: toString] }");
  });

  test("{} with message and toString property (nested)", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log({
      nestedObject: { message: "object message", toString: () => "object toString" },
    });
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe(
      "{ nestedObject: { message: 'object message', toString: [Function: toString] } }",
    );
  });

  test("[]", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log([]);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("[]");
  });

  test("[] with values", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0]);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("[ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0 ]");
  });

  test("regexp", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log(/regexp/);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("/regexp/");
  });

  describe("function", () => {
    test("arrow", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();
      gasConsole.log(() => {});
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("[Function]");
    });

    test("anonymous", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();
      gasConsole.log(function () {});
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("[Function]");
    });

    test("named", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();
      gasConsole.log(function namedFn() {});
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("[Function: namedFn]");
    });
  });

  describe("class", () => {
    describe("definition", () => {
      test("anonymous", () => {
        using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
        const gasConsole = new Console();
        gasConsole.log(class {});
        const args = consoleMock.mock.lastCall;
        expect(args?.[1]).toBe("[Function]");
      });

      test("named", () => {
        using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
        const gasConsole = new Console();
        class NamedClass {
          member1: number;
          member2: number;

          constructor() {
            this.member1 = 0;
            this.member2 = 1;
          }
          member3() {}
        }
        gasConsole.log(NamedClass);
        const args = consoleMock.mock.lastCall;
        expect(args?.[1]).toBe("[Function: NamedClass]");
      });

      test("anonymous with member", () => {
        using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
        const gasConsole = new Console();
        gasConsole.log(
          class {
            member1: number;
            member2: number;

            constructor() {
              this.member1 = 0;
              this.member2 = 1;
            }
            member3() {}
          },
        );
        const args = consoleMock.mock.lastCall;
        expect(args?.[1]).toBe("[Function]");
      });

      test("instance", () => {
        using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
        const gasConsole = new Console();
        class NamedClass {
          member1: number;
          member2: number;

          constructor() {
            this.member1 = 0;
            this.member2 = 1;
          }
          member3() {}
        }
        gasConsole.log(new NamedClass());
        const args = consoleMock.mock.lastCall;
        expect(args?.[1]).toBe("{ member1: 0, member2: 1 }");
      });

      test("GAS API", () => {
        using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
        const gasConsole = new Console();
        gasConsole.log(new HtmlService((() => {}) as any, (() => {}) as any));
        const args = consoleMock.mock.lastCall;
        expect(args?.[1]).toMatch(/^{ toString: \[Function\],/g);
        expect(args?.[1]).toMatch(/createHtmlOutputFromFile: \[Function\],/);
        expect(args?.[1]).toMatch(/createHtmlOutput: \[Function\],/);
        expect(args?.[1]).toMatch(/createTemplateFromFile: \[Function\],/);
        expect(args?.[1]).toMatch(/createTemplate: \[Function\],/);
        expect(args?.[1]).toMatch(/SandboxMode:/);
        expect(args?.[1]).toMatch(/   EMULATED:/);
        expect(args?.[1]).toMatch(/   IFRAME:/);
        expect(args?.[1]).toMatch(/   NATIVE:/);
        expect(args?.[1]).toMatch(/XFrameOptionsMode:/);
        expect(args?.[1]).toMatch(/   ALLOWALL:/);
        expect(args?.[1]).toMatch(/   DEFAULT:/);
        expect(args?.[1]).toMatch(/ } }$/g);
      });

      test("instance (nested)", () => {
        using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
        const gasConsole = new Console();
        class NamedClass {
          member1: number;
          member2: number;

          constructor() {
            this.member1 = 0;
            this.member2 = 1;
          }
          member3() {}
        }
        gasConsole.log({ nestedClass: new NamedClass() });
        const args = consoleMock.mock.lastCall;
        expect(args?.[1]).toBe("{ nestedClass: { member1: 0, member2: 1 } }");
      });

      test("GAS API (nested)", () => {
        using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
        const gasConsole = new Console();
        gasConsole.log({ nestedGASAPI: new HtmlService((() => {}) as any, (() => {}) as any) });
        const args = consoleMock.mock.lastCall;
        expect(args?.[1]).toMatch(/^{ nestedGASAPI:/g);
        expect(args?.[1]).toMatch(/  { toString: \[Function\],/);
        expect(args?.[1]).toMatch(/    createHtmlOutputFromFile: \[Function\],/);
        expect(args?.[1]).toMatch(/    createHtmlOutput: \[Function\],/);
        expect(args?.[1]).toMatch(/    createTemplateFromFile: \[Function\],/);
        expect(args?.[1]).toMatch(/    createTemplate: \[Function\],/);
        expect(args?.[1]).toMatch(/    SandboxMode:/);
        expect(args?.[1]).toMatch(/       EMULATED:/);
        expect(args?.[1]).toMatch(/       IFRAME:/);
        expect(args?.[1]).toMatch(/       NATIVE:/);
        expect(args?.[1]).toMatch(/    XFrameOptionsMode:/);
        expect(args?.[1]).toMatch(/       ALLOWALL:/);
        expect(args?.[1]).toMatch(/       DEFAULT:/);
        expect(args?.[1]).toMatch(/ } } }$/g);
      });
    });
  });
});

describe("output with string format", () => {
  describe("boolean", () => {
    test("true", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();
      gasConsole.log("%s", true);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("true");
    });

    test("false", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();
      gasConsole.log("%s", false);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("false");
    });
  });

  describe("number", () => {
    test("decimal", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();
      gasConsole.log("%s", 0);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("0");
    });

    test("replace any digits with 0 if they exceed 18", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();
      // oxlint-disable-next-line no-loss-of-precision
      gasConsole.log("%s", 12345678901234567890);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("12345678901234567000");
    });

    test("with 18 or more decimal places are truncated", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();
      // oxlint-disable-next-line no-loss-of-precision
      gasConsole.log("%s", 3.14159265358979323846);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("3.141592653589793");
    });

    test("Infinity", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();
      gasConsole.log("%s", Infinity);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("Infinity");
    });

    test("NaN", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();
      gasConsole.log("%s", NaN);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("NaN");
    });
  });

  test("empty string", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%s", "");
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("");
  });

  test("string", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%s", "Hello, world!");
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("Hello, world!");
  });

  test("symbol", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%s", Symbol.for("sym"));
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("Symbol(sym)");
  });

  test("null", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%s", null);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("null");
  });

  test("undefined", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%s", undefined);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("undefined");
  });

  test("{}", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%s", {});
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("[object Object]");
  });

  test("{} with properties", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%s", { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7, i: 8, j: 9, k: 0 });
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("[object Object]");
  });

  test("{} with message property", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%s", { message: "object message" });
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("[object Object]");
  });

  test("{} with toString property", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%s", { toString: () => "object toString" });
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("object toString");
  });

  test("{} with message and toString property", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%s", { message: "object message", toString: () => "object toString" });
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("object toString");
  });

  test("{} with message and toString property (nested)", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%s", {
      nestedObject: { message: "object message", toString: () => "object toString" },
    });
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("[object Object]");
  });

  test("[]", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%s", []);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("");
  });

  test("[] with values", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%s", [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0]);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("0,1,2,3,4,5,6,7,8,9,0");
  });

  test("regexp", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%s", /regexp/);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("/regexp/");
  });

  describe("function", () => {
    test("arrow", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();
      gasConsole.log("%s", () => {});
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("() => {}");
    });

    test("anonymous", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();
      gasConsole.log("%s", function () {});
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("function () {}");
    });

    test("named", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();
      gasConsole.log("%s", function namedFn() {});
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("function namedFn() {}");
    });
  });

  describe("class", () => {
    describe("definition", () => {
      test("anonymous", () => {
        using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
        const gasConsole = new Console();
        gasConsole.log("%s", class {});
        const args = consoleMock.mock.lastCall;
        expect(args?.[1]).toBe("class {}");
      });

      test("named", () => {
        using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
        const gasConsole = new Console();
        class NamedClass {
          member1: number;
          member2: number;

          constructor() {
            this.member1 = 0;
            this.member2 = 1;
          }
          member3() {}
        }
        gasConsole.log("%s", NamedClass);
        const args = consoleMock.mock.lastCall;
        expect(args?.[1]).toMatch(
          /class NamedClass {\n.+constructor\(\) {\n\s+this\.member1 = 0;\n\s+this\.member2 = 1;\n\s+}\n\s+member3\(\) {}\n\s+}/gs,
        );
      });

      test("anonymous with member", () => {
        using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
        const gasConsole = new Console();
        gasConsole.log(
          "%s",
          class {
            member1: number;
            member2: number;

            constructor() {
              this.member1 = 0;
              this.member2 = 1;
            }
            member3() {}
          },
        );
        const args = consoleMock.mock.lastCall;
        expect(args?.[1]).toMatch(
          /class {\n.+constructor\(\) {\n\s+this\.member1 = 0;\n\s+this\.member2 = 1;\n\s+}\n\s+member3\(\) {}\n\s+}/gs,
        );
      });

      test("instance", () => {
        using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
        const gasConsole = new Console();
        class NamedClass {
          member1: number;
          member2: number;

          constructor() {
            this.member1 = 0;
            this.member2 = 1;
          }
          member3() {}
        }
        gasConsole.log("%s", new NamedClass());
        const args = consoleMock.mock.lastCall;
        expect(args?.[1]).toBe("[object Object]");
      });

      test("GAS API", () => {
        using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
        const gasConsole = new Console();
        gasConsole.log("%s", new HtmlService((() => {}) as any, (() => {}) as any));
        const args = consoleMock.mock.lastCall;
        expect(args?.[1]).toBe("HtmlService");
      });

      test("instance (nested)", () => {
        using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
        const gasConsole = new Console();
        class NamedClass {
          member1: number;
          member2: number;

          constructor() {
            this.member1 = 0;
            this.member2 = 1;
          }
          member3() {}
        }
        gasConsole.log("%s", { nestedClass: new NamedClass() });
        const args = consoleMock.mock.lastCall;
        expect(args?.[1]).toMatch("[object Object]");
      });

      test("GAS API (nested)", () => {
        using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
        const gasConsole = new Console();
        gasConsole.log("%s", {
          nestedGASAPI: new HtmlService((() => {}) as any, (() => {}) as any),
        });
        const args = consoleMock.mock.lastCall;
        expect(args?.[1]).toBe("[object Object]");
      });
    });
  });
});

describe("output with number format", () => {
  describe("boolean", () => {
    test("true", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();
      gasConsole.log("%d", true);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("1");
    });

    test("false", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();
      gasConsole.log("%d", false);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("0");
    });
  });

  describe("number", () => {
    test("decimal", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();
      gasConsole.log("%d", 0);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("0");
    });

    test("replace any digits with 0 if they exceed 18", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();
      // oxlint-disable-next-line no-loss-of-precision
      gasConsole.log("%d", 12345678901234567890);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("12345678901234567000");
    });

    test("with 18 or more decimal places are truncated", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();
      // oxlint-disable-next-line no-loss-of-precision
      gasConsole.log("%d", 3.14159265358979323846);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("3.141592653589793");
    });

    test("Infinity", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();
      gasConsole.log("%d", Infinity);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("Infinity");
    });

    test("NaN", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();
      gasConsole.log("%d", NaN);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("NaN");
    });
  });

  test("empty string", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%d", "");
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("0");
  });

  test("string", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%d", "Hello, world!");
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("NaN");
  });

  test("null", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%d", null);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("0");
  });

  test("undefined", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%d", undefined);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("NaN");
  });

  test("{}", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%d", {});
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("NaN");
  });

  test("{} with properties", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%d", { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7, i: 8, j: 9, k: 0 });
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("NaN");
  });

  test("{} with message property", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%d", { message: "object message" });
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("NaN");
  });

  test("{} with toString property", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%d", { toString: () => "object toString" });
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("NaN");
  });

  test("{} with message and toString property", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%d", { message: "object message", toString: () => "object toString" });
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("NaN");
  });

  test("{} with message and toString property (nested)", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%d", {
      nestedObject: { message: "object message", toString: () => "object toString" },
    });
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("NaN");
  });

  test("[]", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%d", []);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("0");
  });

  test("[] with values", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%d", [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0]);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("NaN");
  });

  test("regexp", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%d", /regexp/);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("NaN");
  });

  describe("function", () => {
    test("arrow", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();
      gasConsole.log("%d", () => {});
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("NaN");
    });

    test("anonymous", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();
      gasConsole.log("%d", function () {});
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("NaN");
    });

    test("named", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();
      gasConsole.log("%d", function namedFn() {});
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("NaN");
    });
  });

  describe("class", () => {
    describe("definition", () => {
      test("anonymous", () => {
        using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
        const gasConsole = new Console();
        gasConsole.log("%d", class {});
        const args = consoleMock.mock.lastCall;
        expect(args?.[1]).toBe("NaN");
      });

      test("named", () => {
        using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
        const gasConsole = new Console();
        class NamedClass {
          member1: number;
          member2: number;

          constructor() {
            this.member1 = 0;
            this.member2 = 1;
          }
          member3() {}
        }
        gasConsole.log("%d", NamedClass);
        const args = consoleMock.mock.lastCall;
        expect(args?.[1]).toBe("NaN");
      });

      test("anonymous with member", () => {
        using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
        const gasConsole = new Console();
        gasConsole.log(
          "%d",
          class {
            member1: number;
            member2: number;

            constructor() {
              this.member1 = 0;
              this.member2 = 1;
            }
            member3() {}
          },
        );
        const args = consoleMock.mock.lastCall;
        expect(args?.[1]).toBe("NaN");
      });

      test("instance", () => {
        using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
        const gasConsole = new Console();
        class NamedClass {
          member1: number;
          member2: number;

          constructor() {
            this.member1 = 0;
            this.member2 = 1;
          }
          member3() {}
        }
        gasConsole.log("%d", new NamedClass());
        const args = consoleMock.mock.lastCall;
        expect(args?.[1]).toBe("NaN");
      });

      test("GAS API", () => {
        using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
        const gasConsole = new Console();
        gasConsole.log("%d", new HtmlService((() => {}) as any, (() => {}) as any));
        const args = consoleMock.mock.lastCall;
        expect(args?.[1]).toBe("NaN");
      });

      test("instance (nested)", () => {
        using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
        const gasConsole = new Console();
        class NamedClass {
          member1: number;
          member2: number;

          constructor() {
            this.member1 = 0;
            this.member2 = 1;
          }
          member3() {}
        }
        gasConsole.log("%d", { nestedClass: new NamedClass() });
        const args = consoleMock.mock.lastCall;
        expect(args?.[1]).toBe("NaN");
      });

      test("GAS API (nested)", () => {
        using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
        const gasConsole = new Console();
        gasConsole.log("%d", {
          nestedGASAPI: new HtmlService((() => {}) as any, (() => {}) as any),
        });
        const args = consoleMock.mock.lastCall;
        expect(args?.[1]).toBe("NaN");
      });
    });
  });
});

describe("output with json format", () => {
  describe("boolean", () => {
    test("true", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();
      gasConsole.log("%j", true);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("true");
    });

    test("false", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();
      gasConsole.log("%j", false);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("false");
    });
  });

  describe("number", () => {
    test("decimal", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();
      gasConsole.log("%j", 0);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("0");
    });

    test("replace any digits with 0 if they exceed 18", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();
      // oxlint-disable-next-line no-loss-of-precision
      gasConsole.log("%j", 12345678901234567890);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("12345678901234567000");
    });

    test("with 18 or more decimal places are truncated", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();
      // oxlint-disable-next-line no-loss-of-precision
      gasConsole.log("%j", 3.14159265358979323846);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("3.141592653589793");
    });

    test("Infinity", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();
      gasConsole.log("%j", Infinity);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("null");
    });

    test("NaN", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();
      gasConsole.log("%j", NaN);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("null");
    });
  });

  test("empty string", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%j", "");
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe('""');
  });

  test("string", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%j", "Hello, world!");
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe('"Hello, world!"');
  });

  test("symbol", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%j", Symbol.for("sym"));
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("undefined");
  });

  test("null", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%j", null);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("null");
  });

  test("undefined", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%j", undefined);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("undefined");
  });

  test("{}", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%j", {});
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("{}");
  });

  test("{} with properties", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%j", { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7, i: 8, j: 9, k: 0 });
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe('{"a":0,"b":1,"c":2,"d":3,"e":4,"f":5,"g":6,"h":7,"i":8,"j":9,"k":0}');
  });

  test("{} with message property", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%j", { message: "object message" });
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe('{"message":"object message"}');
  });

  test("{} with toString property", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%j", { toString: () => "object toString" });
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("{}");
  });

  test("{} with message and toString property", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%j", { message: "object message", toString: () => "object toString" });
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe('{"message":"object message"}');
  });

  test("{} with message and toString property (nested)", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%j", {
      nestedObject: { message: "object message", toString: () => "object toString" },
    });
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe('{"nestedObject":{"message":"object message"}}');
  });

  test("[]", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%j", []);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("[]");
  });

  test("[] with values", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%j", [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0]);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("[0,1,2,3,4,5,6,7,8,9,0]");
  });

  test("regexp", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%j", /regexp/);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("{}");
  });

  describe("function", () => {
    test("arrow", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();
      gasConsole.log("%j", () => {});
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("undefined");
    });

    test("anonymous", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();
      gasConsole.log("%j", function () {});
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("undefined");
    });

    test("named", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();
      gasConsole.log("%j", function namedFn() {});
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("undefined");
    });
  });

  describe("class", () => {
    describe("definition", () => {
      test("anonymous", () => {
        using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
        const gasConsole = new Console();
        gasConsole.log("%j", class {});
        const args = consoleMock.mock.lastCall;
        expect(args?.[1]).toBe("undefined");
      });

      test("named", () => {
        using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
        const gasConsole = new Console();
        class NamedClass {
          member1: number;
          member2: number;

          constructor() {
            this.member1 = 0;
            this.member2 = 1;
          }
          member3() {}
        }
        gasConsole.log("%j", NamedClass);
        const args = consoleMock.mock.lastCall;
        expect(args?.[1]).toBe("undefined");
      });

      test("anonymous with member", () => {
        using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
        const gasConsole = new Console();
        gasConsole.log(
          "%j",
          class {
            member1: number;
            member2: number;

            constructor() {
              this.member1 = 0;
              this.member2 = 1;
            }
            member3() {}
          },
        );
        const args = consoleMock.mock.lastCall;
        expect(args?.[1]).toBe("undefined");
      });

      test("instance", () => {
        using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
        const gasConsole = new Console();
        class NamedClass {
          member1: number;
          member2: number;

          constructor() {
            this.member1 = 0;
            this.member2 = 1;
          }
          member3() {}
        }
        gasConsole.log("%j", new NamedClass());
        const args = consoleMock.mock.lastCall;
        expect(args?.[1]).toBe('{"member1":0,"member2":1}');
      });

      test("GAS API", () => {
        using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
        const gasConsole = new Console();
        gasConsole.log("%j", new HtmlService((() => {}) as any, (() => {}) as any));
        const args = consoleMock.mock.lastCall;
        expect(args?.[1]).toBe('{"SandboxMode":"EMULATED","XFrameOptionsMode":"DEFAULT"}');
      });
    });

    test("instance (nested)", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();
      class NamedClass {
        member1: number;
        member2: number;

        constructor() {
          this.member1 = 0;
          this.member2 = 1;
        }
        member3() {}
      }
      gasConsole.log("%j", { nestedClass: new NamedClass() });
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe('{"nestedClass":{"member1":0,"member2":1}}');
    });

    test("GAS API (nested)", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();
      gasConsole.log("%j", { nestedGASAPI: new HtmlService((() => {}) as any, (() => {}) as any) });
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe(
        '{"nestedGASAPI":{"SandboxMode":"EMULATED","XFrameOptionsMode":"DEFAULT"}}',
      );
    });
  });
});

describe("log level", () => {
  test("info", () => {
    using consoleMock = vi.spyOn(console, "info").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.info();
    const args = consoleMock.mock.lastCall;
    expect(args?.[0]).toMatch(/Info/);
  });

  test("log (info)", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log();
    const args = consoleMock.mock.lastCall;
    expect(args?.[0]).toMatch(/Info/);
  });

  test("warn", () => {
    using consoleMock = vi.spyOn(console, "warn").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.warn();
    const args = consoleMock.mock.lastCall;
    expect(args?.[0]).toMatch(/Warning/);
  });

  test("error", () => {
    using consoleMock = vi.spyOn(console, "error").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.error();
    const args = consoleMock.mock.lastCall;
    expect(args?.[0]).toMatch(/Error/);
  });
});

describe("timer", () => {
  test("with debug level", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.time("");
    gasConsole.timeEnd("");
    const args = consoleMock.mock.lastCall;
    expect(args?.[0]).toMatch(/Debug/);
  });

  test("with empty label", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.time("");
    gasConsole.timeEnd("");
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toMatch(/^: \d+ms$/);
  });

  test("with label", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.time("label");
    gasConsole.timeEnd("label");
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toMatch(/^label: \d+ms$/);
  });

  test("call timeEnd first and throw an error", () => {
    const gasConsole = new Console();
    expect(() => gasConsole.timeEnd("")).toThrow(
      /^The parameters \(.*\) don't match the method signature for console\.timeEnd\.$/,
    );
  });

  test("calling timeEnd twice in a row throws an error", () => {
    const gasConsole = new Console();
    gasConsole.time("");
    gasConsole.timeEnd("");
    expect(() => gasConsole.timeEnd("")).toThrow(
      /^The parameters \(.*\) don't match the method signature for console\.timeEnd\.$/,
    );
  });
});

describe("other", () => {
  test("mix format", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%s %% %d %j", {}, 0, {});
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("[object Object] % 0 {}");
  });

  test("ignore unknown format", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%s %% %i %d %j", {}, 0, {});
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("[object Object] % %i 0 {}");
  });

  test("duplicate format", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%s %%%dd %j %d", {}, 0, {}, 10);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("[object Object] %0d {} 10");
  });

  test("few format", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%s %d %j %d", {}, 0, {}, 10, "a", 10, {});
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("[object Object] 0 {} 10 a 10 {}");
  });

  test("no format", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log({}, 0, {}, 10, "a");
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("{} 0 {} 10 'a'");
  });
});
