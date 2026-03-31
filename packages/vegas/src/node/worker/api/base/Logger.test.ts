import { describe, expect, test, vi } from "vitest";

import { Logger } from "./Logger";

describe("direct output", () => {
  test("output log prefix.", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = new Logger();
    logger.log({});
    const args = consoleMock.mock.lastCall;
    expect(args?.[0]).toMatch(/ Logger \(GAS\)   \d{2}:\d{2}:\d{2}  Info      /);
  });

  describe("plain object", () => {
    test("output as parenthetical pairs.", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const logger = new Logger();
      logger.log({});
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("{}");
    });

    test("output message properties.", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const logger = new Logger();
      logger.log({
        message: "Hello, from message!",
      });
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("Hello, from message!");
    });

    test("do not output toString result value. (property function)", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const logger = new Logger();
      logger.log({
        toString() {
          return "Hello, from toString!";
        },
      });
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe('{toString=toString() {return "Hello, from toString!";}}');
    });

    test("do not output toString result value. (arrow function)", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const logger = new Logger();
      logger.log({
        toString: () => {
          return "Hello, from toString!";
        },
      });
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe('{toString=() => {return "Hello, from toString!";}}');
    });

    test("output multiple properties without formatting.", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const logger = new Logger();
      logger.log({
        msg1: "Hello, from msg1!",
        msg2: "Hello, from msg2!",
        toString: () => {
          return "Hello, from toString!";
        },
      });
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe(
        '{msg1=Hello, from msg1!, msg2=Hello, from msg2!, toString=() => {return "Hello, from toString!";}}',
      );
    });
  });

  describe("class", () => {
    test("output class definition.", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const logger = new Logger();

      class Test {}

      logger.log(Test);
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("class Test {}");
    });

    test("output class instance as plain object.", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const logger = new Logger();

      class Test {}

      logger.log(new Test());
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("{}");
    });

    test("output message properties.", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const logger = new Logger();

      class Test {
        message: string = "Hello, from message!";
      }

      logger.log(new Test());
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("Hello, from message!");
    });

    test("output toString result value.", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const logger = new Logger();

      class Test {
        toString() {
          return "Hello, from toString!";
        }
      }

      logger.log(new Test());
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("Hello, from toString!");
    });

    test("prioritize output from the message property.", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const logger = new Logger();

      class Test {
        message: string = "Hello, from message!";
        toString() {
          return "Hello, from toString!";
        }
      }

      logger.log(new Test());
      const args = consoleMock.mock.lastCall;
      expect(args?.[1]).toBe("Hello, from message!");
    });
  });

  test("output the class name of the GAS API instance.", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = new Logger();
    logger.log(logger);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("Logger");
  });

  test("output integer with first decimal place.", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = new Logger();
    logger.log(0);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("0.0");
  });

  test("output up to 15 decimal places.", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = new Logger();
    // oxlint-disable-next-line no-loss-of-precision
    logger.log(3.141592653589793238462643383279);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("3.141592653589793");
  });

  test("output function definition. (anonymous function)", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = new Logger();
    logger.log(function () {});
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("function() {}");
  });

  test("output function definition. (arrow function)", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = new Logger();
    logger.log(() => {});
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("() => {}");
  });

  test("output function definition. (definition function)", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = new Logger();

    function testFn() {}

    logger.log(testFn);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("function testFn() {}");
  });

  test("output boolean.", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = new Logger();
    logger.log(true);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("true");
  });

  test("output null.", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = new Logger();
    logger.log(null);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("null");
  });

  test("output undefined as null.", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = new Logger();
    logger.log(undefined);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("null");
  });

  test("do not output symbol.", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = new Logger();
    logger.log(Symbol("vegas"));
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("");
  });
});

describe("format output", () => {
  test("output literal.", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = new Logger();
    logger.log("%s", "test");
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("test");
  });

  test("output object.", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = new Logger();
    logger.log("%s", {});
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("{}");
  });

  test("output null.", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = new Logger();
    logger.log("%s", null);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("null");
  });

  test("output undefined as null.", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = new Logger();
    logger.log("%s", undefined);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("null");
  });

  test("output formatted object.", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = new Logger();
    logger.log("%s", { num: 1 });
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("{num=1.0}");
  });

  test("output number.", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = new Logger();
    logger.log("%d", 1);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("1.0");
  });

  test("output string number.", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = new Logger();
    logger.log("%d", "1");
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("1.0");
  });

  test("output NaN when not number.", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = new Logger();
    logger.log("%d", {});
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("NaN");
  });

  test("output formatted JSON object.", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = new Logger();
    logger.log("%j", { num: 1 });
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("{num=1.0}");
  });

  test("output formatted JSON object. (primitive)", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = new Logger();
    logger.log("%j", "str");
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("str");
  });

  test("output percent. (ignore 2nd arg)", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = new Logger();
    logger.log("%%", 1);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("%");
  });

  test("output multiple format.", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = new Logger();
    logger.log("%s %s %d point", "This", "is", 5);
    const args = consoleMock.mock.lastCall;
    expect(args?.[1]).toBe("This is 5.0 point");
  });
});

describe("stock logs", () => {
  test("get stocked log.", () => {
    const outputLogPrefixRegEx =
      "^[A-Z][a-z]{2} [A-Z][a-z]{2} \\d{1,2} \\d{2}:\\d{2}:\\d{2} [A-Z]{3}[^ ]* \\d{4} INFO: ";
    using _ = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = new Logger();
    logger.log("first");
    logger.log("second");
    const outputLogs = logger.getLog().split("\n");
    expect(outputLogs[0]).toMatch(new RegExp(`${outputLogPrefixRegEx}first$`));
    expect(outputLogs[1]).toMatch(new RegExp(`${outputLogPrefixRegEx}second$`));
  });

  test("clear stocked log.", () => {
    using _ = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = new Logger();
    logger.log("first");
    logger.log("second");
    logger.clear();
    expect(logger.getLog()).toBe("");
  });
});
