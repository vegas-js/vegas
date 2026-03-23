import { describe, expect, test, vi } from "vitest";

import { Logger } from "./Logger";

const logPrefixRegEx = " Logger \\(GAS\\)   \\d{2}:\\d{2}:\\d{2}  Info      ";

describe("direct output", () => {
  describe("plain object", () => {
    test("output as parenthetical pairs.", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const logger = new Logger();
      logger.log({});
      const argValue = consoleMock.mock.lastCall?.[0];
      expect(argValue).toMatch(new RegExp(`${logPrefixRegEx}\\{\\}`));
    });
    test("output message properties.", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const logger = new Logger();
      logger.log({
        message: "Hello, from message!",
      });
      const argValue = consoleMock.mock.lastCall?.[0];
      expect(argValue).toMatch(new RegExp(`${logPrefixRegEx}Hello, from message!`));
    });
    test("do not output toString result value. (property function)", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const logger = new Logger();
      logger.log({
        toString() {
          return "Hello, from toString!";
        },
      });
      const argValue = consoleMock.mock.lastCall?.[0];
      expect(argValue).toMatch(
        new RegExp(
          `${logPrefixRegEx}\\{toString=toString\\(\\) \\{return "Hello, from toString!";\\}\\}`,
        ),
      );
    });
    test("do not output toString result value. (arrow function)", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const logger = new Logger();
      logger.log({
        toString: () => {
          return "Hello, from toString!";
        },
      });
      const argValue = consoleMock.mock.lastCall?.[0];
      expect(argValue).toMatch(
        new RegExp(
          `${logPrefixRegEx}\\{toString=\\(\\) => \\{return "Hello, from toString!";\\}\\}`,
        ),
      );
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
      const argValue = consoleMock.mock.lastCall?.[0];
      expect(argValue).toMatch(
        new RegExp(
          `${logPrefixRegEx}\\{msg1=Hello, from msg1!, msg2=Hello, from msg2!, toString=\\(\\) => \\{return "Hello, from toString!";\\}\\}`,
        ),
      );
    });
  });

  describe("class", () => {
    test("output class definition.", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const logger = new Logger();

      class Test {}

      logger.log(Test);
      const argValue = consoleMock.mock.lastCall?.[0];
      expect(argValue).toMatch(new RegExp(`${logPrefixRegEx}class Test \\{\\}`));
    });

    test("output class instance as plain object.", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const logger = new Logger();

      class Test {}

      logger.log(new Test());
      const argValue = consoleMock.mock.lastCall?.[0];
      expect(argValue).toMatch(new RegExp(`${logPrefixRegEx}\\{\\}`));
    });

    test("output message properties.", () => {
      using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
      const logger = new Logger();

      class Test {
        message: string = "Hello, from message!";
      }

      logger.log(new Test());
      const argValue = consoleMock.mock.lastCall?.[0];
      expect(argValue).toMatch(new RegExp(`${logPrefixRegEx}Hello, from message!`));
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
      const argValue = consoleMock.mock.lastCall?.[0];
      expect(argValue).toMatch(new RegExp(`${logPrefixRegEx}Hello, from toString!`));
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
      const argValue = consoleMock.mock.lastCall?.[0];
      expect(argValue).toMatch(new RegExp(`${logPrefixRegEx}Hello, from message!`));
    });
  });

  test("output the class name of the GAS API instance.", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = new Logger();

    logger.log(logger);
    const argValue = consoleMock.mock.lastCall?.[0];
    expect(argValue).toMatch(new RegExp(`${logPrefixRegEx}Logger`));
  });

  test("output integer with first decimal place.", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = new Logger();

    logger.log(0);
    const argValue = consoleMock.mock.lastCall?.[0];
    expect(argValue).toMatch(new RegExp(`${logPrefixRegEx}0\\.0`));
  });

  test("output up to 15 decimal places.", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = new Logger();

    // oxlint-disable-next-line no-loss-of-precision
    logger.log(3.141592653589793238462643383279);
    const argValue = consoleMock.mock.lastCall?.[0];
    expect(argValue).toMatch(new RegExp(`${logPrefixRegEx}3\\.141592653589793`));
  });

  test("output function definition. (anonymous function)", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = new Logger();

    logger.log(function () {});
    const argValue = consoleMock.mock.lastCall?.[0];
    expect(argValue).toMatch(new RegExp(`${logPrefixRegEx}function\\(\\) \\{\\}`));
  });

  test("output function definition. (allow function)", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = new Logger();

    logger.log(() => {});
    const argValue = consoleMock.mock.lastCall?.[0];
    expect(argValue).toMatch(new RegExp(`${logPrefixRegEx}\\(\\) => \\{\\}`));
  });

  test("output function definition. (definition function)", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = new Logger();

    function testFn() {}

    logger.log(testFn);
    const argValue = consoleMock.mock.lastCall?.[0];
    expect(argValue).toMatch(new RegExp(`${logPrefixRegEx}function testFn\\(\\) \\{\\}`));
  });

  test("output null.", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = new Logger();

    logger.log(null);
    const argValue = consoleMock.mock.lastCall?.[0];
    expect(argValue).toMatch(new RegExp(`${logPrefixRegEx}null`));
  });

  test("output undefined as null.", () => {
    using consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = new Logger();

    logger.log(undefined);
    const argValue = consoleMock.mock.lastCall?.[0];
    expect(argValue).toMatch(new RegExp(`${logPrefixRegEx}null`));
  });
});
