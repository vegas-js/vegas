import { describe, expect, test, vi } from "vitest";

import { Console } from "./console";

describe("direct output", () => {
  test("output log prefix.", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log({});
    const args = consoleMock.mock.lastCall;
    expect(args?.[0]).toMatch(/ console\(GAS\)   \d{2}:\d{2}:\d{2}  Info      /);
  });

  describe("plain object", () => {
    test("output as parenthetical pairs.", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();
      gasConsole.log({});
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("{}");
    });

    test("output object when has message properties.", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();
      gasConsole.log({
        message: "Hello, from message!",
      });
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("{ message: 'Hello, from message!' }");
    });

    test("do not output toString result value. (property function)", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();
      gasConsole.log({
        toString() {
          return "Hello, from toString!";
        },
      });
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("{ toString: [Function: toString] }");
    });

    test("do not output toString result value. (arrow function)", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();
      gasConsole.log({
        toString: () => {
          return "Hello, from toString!";
        },
      });
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("{ toString: [Function: toString] }");
    });

    test("output multiple properties without formatting.", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();
      gasConsole.log({
        msg1: "Hello, from msg1!",
        msg2: "Hello, from msg2!",
        toString: () => {
          return "Hello, from toString!";
        },
      });
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe(
        "{ msg1: 'Hello, from msg1!',\n                                    msg2: 'Hello, from msg2!',\n                                    toString: [Function: toString] }",
      );
    });
  });

  describe("class", () => {
    test("output class definition.", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();

      class Test {}

      gasConsole.log(Test);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("[Function: Test]");
    });

    test("output class instance as plain object.", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();

      class Test {}

      gasConsole.log(new Test());
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("[object Object]");
    });

    test("output object when has message properties.", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();

      class Test {
        message: string = "Hello, from message!";
      }

      gasConsole.log(new Test());
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("[object Object]");
    });

    test("output toString result value.", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();

      class Test {
        toString() {
          return "Hello, from toString!";
        }
      }

      gasConsole.log(new Test());
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("Hello, from toString!");
    });

    test("output toString result value. (ignore message property)", () => {
      using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
      const gasConsole = new Console();

      class Test {
        message: string = "Hello, from message!";
        toString() {
          return "Hello, from toString!";
        }
      }

      gasConsole.log(new Test());
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("Hello, from toString!");
    });
  });

  // test("output the class name of the GAS API instance.", () => {
  //   using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
  //   const gasConsole = new Console();
  //   gasConsole.log(gasConsole);
  //   const args = consoleMock.mock.lastCall;
  //   expect(args?.[1]).toBe("console!");
  // });

  test("output integer with first decimal place.", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log(0);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("0");
  });

  test("output up to 15 decimal places.", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    // oxlint-disable-next-line no-loss-of-precision
    gasConsole.log(3.141592653589793238462643383279);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("3.141592653589793");
  });

  test("output function definition. (anonymous function)", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log(function () {});
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("[Function]");
  });

  test("output function definition. (arrow function)", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log(() => {});
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("[Function]");
  });

  test("output function definition. (definition function)", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();

    function testFn() {}

    gasConsole.log(testFn);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("[Function: testFn]");
  });

  test("output boolean.", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log(true);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("true");
  });

  test("output null.", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log(null);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("null");
  });

  test("output undefined.", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log(undefined);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("undefined");
  });

  test("output symbol.", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log(Symbol("vegas"));
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("{}");
  });
});

describe("format output", () => {
  test("output string.", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%s", "test");
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("test");
  });

  test("output symbol.", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%s", Symbol("vegas"));
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("Symbol(vegas)");
  });

  test("output object.", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%s", {});
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("[object Object]");
  });

  test("output object when has property.", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%s", { num: 1 });
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("[object Object]");
  });

  test("output number.", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%d", 3);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("3");
  });

  test("output float number.", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%d", 3.14);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("3.14");
  });

  test("output string number.", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%d", "1");
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("1");
  });

  test("output NaN when not number.", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%d", {});
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("NaN");
  });

  test("output formatted JSON object.", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%j", { num: 1 });
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe('{"num":1}');
  });

  test("output formatted JSON object. (primitive)", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%j", "str");
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe('"str"');
  });

  test("output percent.", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%%", 1);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("% 1");
  });

  test("output multiple format.", () => {
    using consoleMock = vi.spyOn(console, "debug").mockImplementation(() => {});
    const gasConsole = new Console();
    gasConsole.log("%s %s %d point", "This", "is", 5);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("This is 5 point");
  });
});
