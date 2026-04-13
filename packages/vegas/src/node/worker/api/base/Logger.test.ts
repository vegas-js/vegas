import { describe, expect, test, vi } from "vitest";

import { HtmlService } from "../html/HtmlService";
import { Logger } from "./Logger";

describe("direct output", () => {
  test("with prefix", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("");
    const args = consoleMock.mock.lastCall;
    expect(args?.[0]).toMatch(/ Logger \(GAS\)   \d{2}:\d{2}:\d{2}  Info      /);
  });

  describe("boolean", () => {
    test("true", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const gasLogger = new Logger();
      gasLogger.log(true);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("true");
    });

    test("false", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const gasLogger = new Logger();
      gasLogger.log(false);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("false");
    });
  });

  describe("number", () => {
    test("decimal", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const gasLogger = new Logger();
      gasLogger.log(0);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("0.0");
    });

    test("replace any digits with 0 if they exceed 18", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const gasLogger = new Logger();
      // oxlint-disable-next-line no-loss-of-precision
      gasLogger.log(12345678901234567890);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("1.2345678901234567E19");
    });

    test("with 18 or more decimal places are truncated", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const gasLogger = new Logger();
      // oxlint-disable-next-line no-loss-of-precision
      gasLogger.log(3.14159265358979323846);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("3.141592653589793");
    });

    test("Infinity", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const gasLogger = new Logger();
      gasLogger.log(Infinity);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("Infinity");
    });

    test("NaN", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const gasLogger = new Logger();
      gasLogger.log(NaN);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("NaN");
    });
  });

  test("empty string", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("");
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("");
  });

  test("string", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("Hello, world!");
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("Hello, world!");
  });

  test("symbol", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log(Symbol.for("sym"));
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("");
  });

  test("null", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log(null);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("null");
  });

  test("undefined", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log(undefined);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("null");
  });

  test("{}", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log({});
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("{}");
  });

  test("{} with properties", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log({ a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7, i: 8, j: 9, k: 0 });
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toMatch(/^{([a-k]=\d\.\d, ){10}[a-k]=\d\.\d}$/g);
    expect(args?.[1]).toMatch(/a=0\.0/);
    expect(args?.[1]).toMatch(/b=1\.0/);
    expect(args?.[1]).toMatch(/c=2\.0/);
    expect(args?.[1]).toMatch(/d=3\.0/);
    expect(args?.[1]).toMatch(/e=4\.0/);
    expect(args?.[1]).toMatch(/f=5\.0/);
    expect(args?.[1]).toMatch(/g=6\.0/);
    expect(args?.[1]).toMatch(/h=7\.0/);
    expect(args?.[1]).toMatch(/i=8\.0/);
    expect(args?.[1]).toMatch(/j=9\.0/);
    expect(args?.[1]).toMatch(/k=0\.0/);
  });

  test("{} with message property", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log({ message: "object message" });
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("object message");
  });

  test("{} with toString property", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log({ toString: () => "object toString" });
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe('{toString=() => "object toString"}');
  });

  test("{} with message and toString property", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log({ message: "object message", toString: () => "object toString" });
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("object message");
  });

  test("{} with message and toString property (nested)", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log({
      nestedObject: { message: "object message", toString: () => "object toString" },
    });
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toMatch(/^{nestedObject={.*, .*}}$/);
    expect(args?.[1]).toMatch(/toString=\(\) => "object toString"/);
    expect(args?.[1]).toMatch(/message=object message/);
  });

  test("[]", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log([]);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("[]");
  });

  test("[] with values", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0]);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("[0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 0.0]");
  });

  test("regexp", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log(/regexp/);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("{}");
  });

  describe("function", () => {
    test("arrow", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const gasLogger = new Logger();
      gasLogger.log(() => {});
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("() => {}");
    });

    test("anonymous", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const gasLogger = new Logger();
      gasLogger.log(function () {});
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("function () {}");
    });

    test("named", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const gasLogger = new Logger();
      gasLogger.log(function namedFn() {});
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("function namedFn() {}");
    });
  });

  describe("class", () => {
    describe("definition", () => {
      test("anonymous", () => {
        using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
        const gasLogger = new Logger();
        gasLogger.log(class {});
        const args = consoleMock.mock.lastCall;
        expect(args?.[1]).toBe("class {}");
      });

      test("named", () => {
        using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
        const gasLogger = new Logger();
        class NamedClass {
          member1: number;
          member2: number;

          constructor() {
            this.member1 = 0;
            this.member2 = 1;
          }
          member3() {}
        }
        gasLogger.log(NamedClass);
        const args = consoleMock.mock.lastCall;
        expect(args?.[1]).toMatch(
          /^class NamedClass {\n.+constructor\(\) {\n\s+this\.member1 = 0;\n\s+this\.member2 = 1;\n\s+}\n\s+member3\(\) {}\n\s+}$/gs,
        );
      });

      test("anonymous with member", () => {
        using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
        const gasLogger = new Logger();
        gasLogger.log(
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
          /^class {\n.+constructor\(\) {\n\s+this\.member1 = 0;\n\s+this\.member2 = 1;\n\s+}\n\s+member3\(\) {}\n\s+}$/gs,
        );
      });

      test("instance", () => {
        using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
        const gasLogger = new Logger();
        class NamedClass {
          member1: number;
          member2: number;

          constructor() {
            this.member1 = 0;
            this.member2 = 1;
          }
          member3() {}
        }
        gasLogger.log(new NamedClass());
        const args = consoleMock.mock.lastCall;
        expect(args?.[1]).toMatch(/^{member\d=\d\.\d, member\d=\d\.\d}$/);
        expect(args?.[1]).toMatch(/member1=0\.0/);
        expect(args?.[1]).toMatch(/member2=1\.0/);
      });

      test("GAS API", () => {
        using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
        const gasLogger = new Logger();
        gasLogger.log(new HtmlService((() => {}) as any, (() => {}) as any));
        const args = consoleMock.mock.lastCall;
        expect(args?.[1]).toBe("HtmlService");
      });

      test("instance (nested)", () => {
        using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
        const gasLogger = new Logger();
        class NamedClass {
          member1: number;
          member2: number;

          constructor() {
            this.member1 = 0;
            this.member2 = 1;
          }
          member3() {}
        }
        gasLogger.log({ nestedClass: new NamedClass() });
        const args = consoleMock.mock.lastCall;
        expect(args?.[1]).toMatch(/^{nestedClass={member\d=\d\.\d, member\d=\d\.\d}}$/);
        expect(args?.[1]).toMatch(/member1=0\.0/);
        expect(args?.[1]).toMatch(/member2=1\.0/);
      });

      test("GAS API (nested)", () => {
        using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
        const gasLogger = new Logger();
        gasLogger.log({ nestedGASAPI: new HtmlService((() => {}) as any, (() => {}) as any) });
        const args = consoleMock.mock.lastCall;
        expect(args?.[1]).toBe("{nestedGASAPI=HtmlService}");
      });
    });
  });
});

describe("output with string format", () => {
  describe("boolean", () => {
    test("true", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const gasLogger = new Logger();
      gasLogger.log("%s", true);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("true");
    });

    test("false", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const gasLogger = new Logger();
      gasLogger.log("%s", false);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("false");
    });
  });

  describe("number", () => {
    test("decimal", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const gasLogger = new Logger();
      gasLogger.log("%s", 0);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("0.0");
    });

    test("replace any digits with 0 if they exceed 18", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const gasLogger = new Logger();
      // oxlint-disable-next-line no-loss-of-precision
      gasLogger.log("%s", 12345678901234567890);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("1.2345678901234567E19");
    });

    test("with 18 or more decimal places are truncated", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const gasLogger = new Logger();
      // oxlint-disable-next-line no-loss-of-precision
      gasLogger.log("%s", 3.14159265358979323846);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("3.141592653589793");
    });

    test("Infinity", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const gasLogger = new Logger();
      gasLogger.log("%s", Infinity);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("Infinity");
    });

    test("NaN", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const gasLogger = new Logger();
      gasLogger.log("%s", NaN);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("NaN");
    });
  });

  test("empty string", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("%s", "");
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("");
  });

  test("string", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("%s", "Hello, world!");
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("Hello, world!");
  });

  test("symbol", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("%s", Symbol.for("sym"));
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("");
  });

  test("null", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("%s", null);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("null");
  });

  test("undefined", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("%s", undefined);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("null");
  });

  test("{}", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("%s", {});
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("{}");
  });

  test("{} with properties", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("%s", { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7, i: 8, j: 9, k: 0 });
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toMatch(/^{([a-k]=\d\.\d, ){10}[a-k]=\d\.\d}$/g);
    expect(args?.[1]).toMatch(/a=0\.0/);
    expect(args?.[1]).toMatch(/b=1\.0/);
    expect(args?.[1]).toMatch(/c=2\.0/);
    expect(args?.[1]).toMatch(/d=3\.0/);
    expect(args?.[1]).toMatch(/e=4\.0/);
    expect(args?.[1]).toMatch(/f=5\.0/);
    expect(args?.[1]).toMatch(/g=6\.0/);
    expect(args?.[1]).toMatch(/h=7\.0/);
    expect(args?.[1]).toMatch(/i=8\.0/);
    expect(args?.[1]).toMatch(/j=9\.0/);
    expect(args?.[1]).toMatch(/k=0\.0/);
  });

  test("{} with message property", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("%s", { message: "object message" });
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("{message=object message}");
  });

  test("{} with toString property", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("%s", { toString: () => "object toString" });
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe('{toString=() => "object toString"}');
  });

  test("{} with message and toString property", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("%s", { message: "object message", toString: () => "object toString" });
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toMatch(/^{.*, .*}$/);
    expect(args?.[1]).toMatch(/toString=\(\) => "object toString"/);
    expect(args?.[1]).toMatch(/message=object message/);
  });

  test("{} with message and toString property (nested)", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("%s", {
      nestedObject: { message: "object message", toString: () => "object toString" },
    });
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toMatch(/^{nestedObject={.*, .*}}$/);
    expect(args?.[1]).toMatch(/toString=\(\) => "object toString"/);
    expect(args?.[1]).toMatch(/message=object message/);
  });

  test("[]", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("%s", []);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("[]");
  });

  test("[] with values", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("%s", [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0]);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("[0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 0.0]");
  });

  test("regexp", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("%s", /regexp/);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("{}");
  });

  describe("function", () => {
    test("arrow", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const gasLogger = new Logger();
      gasLogger.log("%s", () => {});
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("() => {}");
    });

    test("anonymous", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const gasLogger = new Logger();
      gasLogger.log("%s", function () {});
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("function () {}");
    });

    test("named", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const gasLogger = new Logger();
      gasLogger.log("%s", function namedFn() {});
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("function namedFn() {}");
    });
  });

  describe("class", () => {
    describe("definition", () => {
      test("anonymous", () => {
        using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
        const gasLogger = new Logger();
        gasLogger.log("%s", class {});
        const args = consoleMock.mock.lastCall;
        expect(args?.[1]).toBe("class {}");
      });

      test("named", () => {
        using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
        const gasLogger = new Logger();
        class NamedClass {
          member1: number;
          member2: number;

          constructor() {
            this.member1 = 0;
            this.member2 = 1;
          }
          member3() {}
        }
        gasLogger.log("%s", NamedClass);
        const args = consoleMock.mock.lastCall;
        expect(args?.[1]).toMatch(
          /class NamedClass {\n.+constructor\(\) {\n\s+this\.member1 = 0;\n\s+this\.member2 = 1;\n\s+}\n\s+member3\(\) {}\n\s+}/gs,
        );
      });

      test("anonymous with member", () => {
        using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
        const gasLogger = new Logger();
        gasLogger.log(
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
        using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
        const gasLogger = new Logger();
        class NamedClass {
          member1: number;
          member2: number;

          constructor() {
            this.member1 = 0;
            this.member2 = 1;
          }
          member3() {}
        }
        gasLogger.log("%s", new NamedClass());
        const args = consoleMock.mock.lastCall;
        expect(args?.[1]).toMatch(/^{member\d=\d\.\d, member\d=\d\.\d}$/);
        expect(args?.[1]).toMatch(/member1=0\.0/);
        expect(args?.[1]).toMatch(/member2=1\.0/);
      });

      test("GAS API", () => {
        using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
        const gasLogger = new Logger();
        gasLogger.log("%s", new HtmlService((() => {}) as any, (() => {}) as any));
        const args = consoleMock.mock.lastCall;
        expect(args?.[1]).toBe("HtmlService");
      });

      test("instance (nested)", () => {
        using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
        const gasLogger = new Logger();
        class NamedClass {
          member1: number;
          member2: number;

          constructor() {
            this.member1 = 0;
            this.member2 = 1;
          }
          member3() {}
        }
        gasLogger.log("%s", { nestedClass: new NamedClass() });
        const args = consoleMock.mock.lastCall;
        expect(args?.[1]).toMatch(/^{nestedClass={member\d=\d\.\d, member\d=\d\.\d}}$/);
        expect(args?.[1]).toMatch(/member1=0\.0/);
        expect(args?.[1]).toMatch(/member2=1\.0/);
      });

      test("GAS API (nested)", () => {
        using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
        const gasLogger = new Logger();
        gasLogger.log("%s", {
          nestedGASAPI: new HtmlService((() => {}) as any, (() => {}) as any),
        });
        const args = consoleMock.mock.lastCall;
        expect(args?.[1]).toBe("{nestedGASAPI=HtmlService}");
      });
    });
  });
});

describe("output with number format", () => {
  describe("boolean", () => {
    test("true", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const gasLogger = new Logger();
      gasLogger.log("%d", true);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("NaN");
    });

    test("false", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const gasLogger = new Logger();
      gasLogger.log("%d", false);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("NaN");
    });
  });

  describe("number", () => {
    test("decimal", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const gasLogger = new Logger();
      gasLogger.log("%d", 0);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("0.0");
    });

    test("replace any digits with 0 if they exceed 18", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const gasLogger = new Logger();
      // oxlint-disable-next-line no-loss-of-precision
      gasLogger.log("%d", 12345678901234567890);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("1.2345678901234567E19");
    });

    test("with 18 or more decimal places are truncated", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const gasLogger = new Logger();
      // oxlint-disable-next-line no-loss-of-precision
      gasLogger.log("%d", 3.14159265358979323846);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("3.141592653589793");
    });

    test("Infinity", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const gasLogger = new Logger();
      gasLogger.log("%d", Infinity);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("Infinity");
    });

    test("NaN", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const gasLogger = new Logger();
      gasLogger.log("%d", NaN);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("NaN");
    });
  });

  test("empty string", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("%d", "");
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("NaN");
  });

  test("string", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("%d", "Hello, world!");
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("NaN");
  });

  test("null", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("%d", null);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("0.0");
  });

  test("undefined", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("%d", undefined);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("0.0");
  });

  test("{}", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("%d", {});
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("NaN");
  });

  test("{} with properties", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("%d", { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7, i: 8, j: 9, k: 0 });
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("NaN");
  });

  test("{} with message property", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("%d", { message: "object message" });
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("NaN");
  });

  test("{} with toString property", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("%d", { toString: () => "object toString" });
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("NaN");
  });

  test("{} with message and toString property", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("%d", { message: "object message", toString: () => "object toString" });
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("NaN");
  });

  test("{} with message and toString property (nested)", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("%d", {
      nestedObject: { message: "object message", toString: () => "object toString" },
    });
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("NaN");
  });

  test("[]", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("%d", []);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("NaN");
  });

  test("[] with values", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("%d", [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0]);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("NaN");
  });

  test("regexp", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("%d", /regexp/);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("NaN");
  });

  describe("function", () => {
    test("arrow", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const gasLogger = new Logger();
      gasLogger.log("%d", () => {});
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("NaN");
    });

    test("anonymous", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const gasLogger = new Logger();
      gasLogger.log("%d", function () {});
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("NaN");
    });

    test("named", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const gasLogger = new Logger();
      gasLogger.log("%d", function namedFn() {});
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("NaN");
    });
  });

  describe("class", () => {
    describe("definition", () => {
      test("anonymous", () => {
        using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
        const gasLogger = new Logger();
        gasLogger.log("%d", class {});
        const args = consoleMock.mock.lastCall;
        expect(args?.[1]).toBe("NaN");
      });

      test("named", () => {
        using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
        const gasLogger = new Logger();
        class NamedClass {
          member1: number;
          member2: number;

          constructor() {
            this.member1 = 0;
            this.member2 = 1;
          }
          member3() {}
        }
        gasLogger.log("%d", NamedClass);
        const args = consoleMock.mock.lastCall;
        expect(args?.[1]).toBe("NaN");
      });

      test("anonymous with member", () => {
        using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
        const gasLogger = new Logger();
        gasLogger.log(
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
        using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
        const gasLogger = new Logger();
        class NamedClass {
          member1: number;
          member2: number;

          constructor() {
            this.member1 = 0;
            this.member2 = 1;
          }
          member3() {}
        }
        gasLogger.log("%d", new NamedClass());
        const args = consoleMock.mock.lastCall;
        expect(args?.[1]).toBe("NaN");
      });

      test("GAS API", () => {
        using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
        const gasLogger = new Logger();
        gasLogger.log("%d", new HtmlService((() => {}) as any, (() => {}) as any));
        const args = consoleMock.mock.lastCall;
        expect(args?.[1]).toBe("NaN");
      });

      test("instance (nested)", () => {
        using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
        const gasLogger = new Logger();
        class NamedClass {
          member1: number;
          member2: number;

          constructor() {
            this.member1 = 0;
            this.member2 = 1;
          }
          member3() {}
        }
        gasLogger.log("%d", { nestedClass: new NamedClass() });
        const args = consoleMock.mock.lastCall;
        expect(args?.[1]).toBe("NaN");
      });

      test("GAS API (nested)", () => {
        using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
        const gasLogger = new Logger();
        gasLogger.log("%d", {
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
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const gasLogger = new Logger();
      gasLogger.log("%j", true);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("true");
    });

    test("false", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const gasLogger = new Logger();
      gasLogger.log("%j", false);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("false");
    });
  });

  describe("number", () => {
    test("decimal", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const gasLogger = new Logger();
      gasLogger.log("%j", 0);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("0.0");
    });

    test("replace any digits with 0 if they exceed 18", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const gasLogger = new Logger();
      // oxlint-disable-next-line no-loss-of-precision
      gasLogger.log("%j", 12345678901234567890);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("1.2345678901234567E19");
    });

    test("with 18 or more decimal places are truncated", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const gasLogger = new Logger();
      // oxlint-disable-next-line no-loss-of-precision
      gasLogger.log("%j", 3.14159265358979323846);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("3.141592653589793");
    });

    test("Infinity", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const gasLogger = new Logger();
      gasLogger.log("%j", Infinity);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("Infinity");
    });

    test("NaN", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const gasLogger = new Logger();
      gasLogger.log("%j", NaN);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("NaN");
    });
  });

  test("empty string", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("%j", "");
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("");
  });

  test("string", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("%j", "Hello, world!");
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("Hello, world!");
  });

  test("symbol", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("%j", Symbol.for("sym"));
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("");
  });

  test("null", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("%j", null);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("null");
  });

  test("undefined", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("%j", undefined);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("null");
  });

  test("{}", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("%j", {});
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("{}");
  });

  test("{} with properties", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("%j", { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7, i: 8, j: 9, k: 0 });
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toMatch(/^{([a-k]=\d\.\d, ){10}[a-k]=\d\.\d}$/g);
    expect(args?.[1]).toMatch(/a=0\.0/);
    expect(args?.[1]).toMatch(/b=1\.0/);
    expect(args?.[1]).toMatch(/c=2\.0/);
    expect(args?.[1]).toMatch(/d=3\.0/);
    expect(args?.[1]).toMatch(/e=4\.0/);
    expect(args?.[1]).toMatch(/f=5\.0/);
    expect(args?.[1]).toMatch(/g=6\.0/);
    expect(args?.[1]).toMatch(/h=7\.0/);
    expect(args?.[1]).toMatch(/i=8\.0/);
    expect(args?.[1]).toMatch(/j=9\.0/);
    expect(args?.[1]).toMatch(/k=0\.0/);
  });

  test("{} with message property", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("%j", { message: "object message" });
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("{message=object message}");
  });

  test("{} with toString property", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("%j", { toString: () => "object toString" });
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe('{toString=() => "object toString"}');
  });

  test("{} with message and toString property", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("%j", { message: "object message", toString: () => "object toString" });
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toMatch(/^{.*, .*}$/);
    expect(args?.[1]).toMatch(/toString=\(\) => "object toString"/);
    expect(args?.[1]).toMatch(/message=object message/);
  });

  test("{} with message and toString property (nested)", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("%j", {
      nestedObject: { message: "object message", toString: () => "object toString" },
    });
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toMatch(/^{nestedObject={.*, .*}}$/);
    expect(args?.[1]).toMatch(/toString=\(\) => "object toString"/);
    expect(args?.[1]).toMatch(/message=object message/);
  });

  test("[]", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("%j", []);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("[]");
  });

  test("[] with values", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("%j", [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0]);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("[0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 0.0]");
  });

  test("regexp", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("%j", /regexp/);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("{}");
  });

  describe("function", () => {
    test("arrow", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const gasLogger = new Logger();
      gasLogger.log("%j", () => {});
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("() => {}");
    });

    test("anonymous", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const gasLogger = new Logger();
      gasLogger.log("%j", function () {});
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("function () {}");
    });

    test("named", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const gasLogger = new Logger();
      gasLogger.log("%j", function namedFn() {});
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("function namedFn() {}");
    });
  });

  describe("class", () => {
    describe("definition", () => {
      test("anonymous", () => {
        using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
        const gasLogger = new Logger();
        gasLogger.log("%j", class {});
        const args = consoleMock.mock.lastCall;
        expect(args?.[1]).toBe("class {}");
      });

      test("named", () => {
        using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
        const gasLogger = new Logger();
        class NamedClass {
          member1: number;
          member2: number;

          constructor() {
            this.member1 = 0;
            this.member2 = 1;
          }
          member3() {}
        }
        gasLogger.log("%j", NamedClass);
        const args = consoleMock.mock.lastCall;
        expect(args?.[1]).toMatch(
          /class NamedClass {\n.+constructor\(\) {\n\s+this\.member1 = 0;\n\s+this\.member2 = 1;\n\s+}\n\s+member3\(\) {}\n\s+}/gs,
        );
      });

      test("anonymous with member", () => {
        using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
        const gasLogger = new Logger();
        gasLogger.log(
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
        expect(args?.[1]).toMatch(
          /class {\n.+constructor\(\) {\n\s+this\.member1 = 0;\n\s+this\.member2 = 1;\n\s+}\n\s+member3\(\) {}\n\s+}/gs,
        );
      });

      test("instance", () => {
        using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
        const gasLogger = new Logger();
        class NamedClass {
          member1: number;
          member2: number;

          constructor() {
            this.member1 = 0;
            this.member2 = 1;
          }
          member3() {}
        }
        gasLogger.log("%j", new NamedClass());
        const args = consoleMock.mock.lastCall;
        expect(args?.[1]).toMatch(/^{member\d=\d\.\d, member\d=\d\.\d}$/);
        expect(args?.[1]).toMatch(/member1=0\.0/);
        expect(args?.[1]).toMatch(/member2=1\.0/);
      });

      test("GAS API", () => {
        using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
        const gasLogger = new Logger();
        gasLogger.log("%j", new HtmlService((() => {}) as any, (() => {}) as any));
        const args = consoleMock.mock.lastCall;
        expect(args?.[1]).toBe("HtmlService");
      });
    });

    test("instance (nested)", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const gasLogger = new Logger();
      class NamedClass {
        member1: number;
        member2: number;

        constructor() {
          this.member1 = 0;
          this.member2 = 1;
        }
        member3() {}
      }
      gasLogger.log("%j", { nestedClass: new NamedClass() });
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toMatch(/^{nestedClass={member\d=\d\.\d, member\d=\d\.\d}}$/);
      expect(args?.[1]).toMatch(/member1=0\.0/);
      expect(args?.[1]).toMatch(/member2=1\.0/);
    });

    test("GAS API (nested)", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const gasLogger = new Logger();
      gasLogger.log("%j", { nestedGASAPI: new HtmlService((() => {}) as any, (() => {}) as any) });
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("{nestedGASAPI=HtmlService}");
    });
  });
});

describe("log", () => {
  test("get", () => {
    const gasLogger = new Logger();
    gasLogger.log("log");
    expect(gasLogger.getLog()).toMatch(/INFO: log$/);
  });

  test("clear", () => {
    const gasLogger = new Logger();
    gasLogger.log("log");
    gasLogger.clear();
    expect(gasLogger.getLog()).toBe("");
  });
});

describe("other", () => {
  test("mix format", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("%s %% %d %j", {}, 0, {});
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("{} % 0.0 {}");
  });

  test("ignore unknown format", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("%s %% %i %d %j", {}, 0, {});
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("{} % %i 0.0 {}");
  });

  test("duplicate format", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("%s %%%dd %j %d", {}, 0, {}, 10);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("{} %0.0d {} 10.0");
  });

  test("few format", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("%s %d %j %d", {}, 0, {}, 10, "a", 10, {});
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("{} 0.0 {} 10.0");
  });

  test("no format", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log({}, 0, {}, 10, "a");
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("{}");
  });

  test("chain", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const gasLogger = new Logger();
    gasLogger.log("Hello").log("world!");
    const calls = consoleMock.mock.calls;
    expect(calls[0][1]).toBe("Hello");
    expect(calls[1][1]).toBe("world!");
  });
});
