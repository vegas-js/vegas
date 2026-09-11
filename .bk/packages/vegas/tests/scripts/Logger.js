// oxlint-disable-next-line no-unused-vars
class NamedClass {
  constructor() {
    this.member1 = 0;
    this.member2 = 1;
  }
  member3() {}
}

// oxlint-disable-next-line no-unused-vars
function testLoggerWithDirect() {
  // GAS Logger does not support no args.
  // Logger.log();
  Logger.log(true);
  Logger.log(false);
  Logger.log(0);
  // oxlint-disable-next-line no-loss-of-precision
  Logger.log(12345678901234567890);
  // GAS does not support Bigint.
  // Logger.log(12345678901234567890n);
  // oxlint-disable-next-line no-loss-of-precision
  Logger.log(3.14159265358979323846);
  Logger.log(Infinity);
  Logger.log(NaN);
  Logger.log("");
  Logger.log("Hello, world!");
  Logger.log(Symbol.for("sym"));
  Logger.log(null);
  Logger.log(undefined);
  Logger.log({});
  Logger.log({ a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7, i: 8, j: 9, k: 0 });
  Logger.log({ message: "object message" });
  Logger.log({ toString: () => "object toString" });
  Logger.log({ message: "object message", toString: () => "object toString" });
  Logger.log({ nestedObject: { message: "object message", toString: () => "object toString" } });
  Logger.log([]);
  Logger.log([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0]);
  Logger.log(/regexp/);
  Logger.log(() => {});
  Logger.log(function () {});
  Logger.log(function namedFn() {});
  Logger.log(class {});
  Logger.log(NamedClass);
  Logger.log(
    class {
      constructor() {
        this.member1 = 0;
        this.member2 = 1;
      }
      member3() {}
    },
  );
  Logger.log(new NamedClass());
  Logger.log(HtmlService);
  Logger.log({ nestedClass: new NamedClass() });
  Logger.log({ nestedGASAPI: HtmlService });
}

// oxlint-disable-next-line no-unused-vars
function testLoggerWithStringFormat() {
  Logger.log("%s", true);
  Logger.log("%s", false);
  Logger.log("%s", 0);
  // oxlint-disable-next-line no-loss-of-precision
  Logger.log("%s", 12345678901234567890);
  // GAS does not support Bigint.
  // Logger.log("%s", 12345678901234567890n);
  // oxlint-disable-next-line no-loss-of-precision
  Logger.log("%s", 3.14159265358979323846);
  Logger.log("%s", Infinity);
  Logger.log("%s", NaN);
  Logger.log("%s", "");
  Logger.log("%s", "Hello, world!");
  Logger.log("%s", Symbol.for("sym"));
  Logger.log("%s", null);
  Logger.log("%s", undefined);
  Logger.log("%s", {});
  Logger.log("%s", { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7, i: 8, j: 9, k: 0 });
  Logger.log("%s", { message: "object message" });
  Logger.log("%s", { toString: () => "object toString" });
  Logger.log("%s", { message: "object message", toString: () => "object toString" });
  Logger.log("%s", {
    nestedObject: { message: "object message", toString: () => "object toString" },
  });
  Logger.log("%s", []);
  Logger.log("%s", [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0]);
  Logger.log("%s", /regexp/);
  Logger.log("%s", () => {});
  Logger.log("%s", function () {});
  Logger.log("%s", function namedFn() {});
  Logger.log("%s", class {});
  class NamedClass {
    constructor() {
      this.member1 = 0;
      this.member2 = 1;
    }
    member3() {}
  }
  Logger.log("%s", NamedClass);
  Logger.log(
    "%s",
    class {
      constructor() {
        this.member1 = 0;
        this.member2 = 1;
      }
      member3() {}
    },
  );
  Logger.log("%s", new NamedClass());
  Logger.log("%s", HtmlService);
  Logger.log("%s", { nestedClass: new NamedClass() });
  Logger.log("%s", { nestedGASAPI: HtmlService });
}

// oxlint-disable-next-line no-unused-vars
function testLoggerWithNumberFormat() {
  Logger.log("%d", true);
  Logger.log("%d", false);
  Logger.log("%d", 0);
  // oxlint-disable-next-line no-loss-of-precision
  Logger.log("%d", 12345678901234567890);
  // GAS does not support Bigint.
  // Logger.log("%d", 12345678901234567890n);
  // oxlint-disable-next-line no-loss-of-precision
  Logger.log("%d", 3.14159265358979323846);
  Logger.log("%d", Infinity);
  Logger.log("%d", NaN);
  Logger.log("%d", "");
  Logger.log("%d", "Hello, world!");
  // GAS does not support Symbol to Number.
  // Logger.log("%d", Symbol.for("sym"));
  Logger.log("%d", null);
  Logger.log("%d", undefined);
  Logger.log("%d", {});
  Logger.log("%d", { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7, i: 8, j: 9, k: 0 });
  Logger.log("%d", { message: "object message" });
  Logger.log("%d", { toString: () => "object toString" });
  Logger.log("%d", { message: "object message", toString: () => "object toString" });
  Logger.log("%d", {
    nestedObject: { message: "object message", toString: () => "object toString" },
  });
  Logger.log("%d", []);
  Logger.log("%d", [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0]);
  Logger.log("%d", /regexp/);
  Logger.log("%d", () => {});
  Logger.log("%d", function () {});
  Logger.log("%d", function namedFn() {});
  Logger.log("%d", class {});
  class NamedClass {
    constructor() {
      this.member1 = 0;
      this.member2 = 1;
    }
    member3() {}
  }
  Logger.log("%d", NamedClass);
  Logger.log(
    "%d",
    class {
      constructor() {
        this.member1 = 0;
        this.member2 = 1;
      }
      member3() {}
    },
  );
  Logger.log("%d", new NamedClass());
  Logger.log("%d", HtmlService);
  Logger.log("%d", { nestedClass: new NamedClass() });
  Logger.log("%d", { nestedGASAPI: HtmlService });
}

// oxlint-disable-next-line no-unused-vars
function testLoggerWithJsonFormat() {
  Logger.log("%j", true);
  Logger.log("%j", false);
  Logger.log("%j", 0);
  // oxlint-disable-next-line no-loss-of-precision
  Logger.log("%j", 12345678901234567890);
  // GAS does not support Bigint.
  // Logger.log("%j", 12345678901234567890n);
  // oxlint-disable-next-line no-loss-of-precision
  Logger.log("%j", 3.14159265358979323846);
  Logger.log("%j", Infinity);
  Logger.log("%j", NaN);
  Logger.log("%j", "");
  Logger.log("%j", "Hello, world!");
  Logger.log("%j", Symbol.for("sym"));
  Logger.log("%j", null);
  Logger.log("%j", undefined);
  Logger.log("%j", {});
  Logger.log("%j", { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7, i: 8, j: 9, k: 0 });
  Logger.log("%j", { message: "object message" });
  Logger.log("%j", { toString: () => "object toString" });
  Logger.log("%j", { message: "object message", toString: () => "object toString" });
  Logger.log("%j", {
    nestedObject: { message: "object message", toString: () => "object toString" },
  });
  Logger.log("%j", []);
  Logger.log("%j", [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0]);
  Logger.log("%j", /regexp/);
  Logger.log("%j", () => {});
  Logger.log("%j", function () {});
  Logger.log("%j", function namedFn() {});
  Logger.log("%j", class {});
  class NamedClass {
    constructor() {
      this.member1 = 0;
      this.member2 = 1;
    }
    member3() {}
  }
  Logger.log("%j", NamedClass);
  Logger.log(
    "%j",
    class {
      constructor() {
        this.member1 = 0;
        this.member2 = 1;
      }
      member3() {}
    },
  );
  Logger.log("%j", new NamedClass());
  Logger.log("%j", HtmlService);
  Logger.log("%j", { nestedClass: new NamedClass() });
  Logger.log("%j", { nestedGASAPI: HtmlService });
}

// oxlint-disable-next-line no-unused-vars
function testLoggerWithLog() {
  Logger.log("log");
  console.log(Logger.getLog());
  Logger.clear();
  console.log(Logger.getLog());
}

// oxlint-disable-next-line no-unused-vars
function testLoggerWithOther() {
  Logger.log("%s %% %d %j", {}, 0, {});
  Logger.log("%s %% %i %d %j", {}, 0, {});
  Logger.log("%s %%%dd %j %d", {}, 0, {}, 10);
  Logger.log("%s %d %j %d", {}, 0, {}, 10, "a", 10, {});
  Logger.log({}, 0, {}, 10, "a");
  Logger.log("Hello").log("world!");
}
