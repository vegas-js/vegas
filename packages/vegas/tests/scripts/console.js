// oxlint-disable-next-line no-unused-vars
class NamedClass {
  constructor() {
    this.member1 = 0;
    this.member2 = 1;
  }
  member3() {}
}

// oxlint-disable-next-line no-unused-vars
function testConsoleWithDirect() {
  console.log();
  console.log(true);
  console.log(false);
  console.log(0);
  // oxlint-disable-next-line no-loss-of-precision
  console.log(12345678901234567890);
  // GAS does not support Bigint.
  // console.log(12345678901234567890n);
  // oxlint-disable-next-line no-loss-of-precision
  console.log(3.14159265358979323846);
  console.log(Infinity);
  console.log(NaN);
  console.log("");
  console.log("Hello, world!");
  console.log(Symbol.for("sym"));
  console.log(null);
  console.log(undefined);
  console.log({});
  console.log({ a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7, i: 8, j: 9, k: 0 });
  console.log({ message: "object message" });
  console.log({ toString: () => "object toString" });
  console.log({ message: "object message", toString: () => "object toString" });
  console.log({ nestedObject: { message: "object message", toString: () => "object toString" } });
  console.log([]);
  console.log([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0]);
  console.log(/regexp/);
  console.log(() => {});
  console.log(function () {});
  console.log(function namedFn() {});
  console.log(class {});
  console.log(NamedClass);
  console.log(
    class {
      constructor() {
        this.member1 = 0;
        this.member2 = 1;
      }
      member3() {}
    },
  );
  console.log(new NamedClass());
  console.log(HtmlService);
  console.log({ nestedClass: new NamedClass() });
  console.log({ nestedGASAPI: HtmlService });
}

// oxlint-disable-next-line no-unused-vars
function testConsoleWithStringFormat() {
  console.log("%s", true);
  console.log("%s", false);
  console.log("%s", 0);
  // oxlint-disable-next-line no-loss-of-precision
  console.log("%s", 12345678901234567890);
  // GAS does not support Bigint.
  // console.log("%s", 12345678901234567890n);
  // oxlint-disable-next-line no-loss-of-precision
  console.log("%s", 3.14159265358979323846);
  console.log("%s", Infinity);
  console.log("%s", NaN);
  console.log("%s", "");
  console.log("%s", "Hello, world!");
  console.log("%s", Symbol.for("sym"));
  console.log("%s", null);
  console.log("%s", undefined);
  console.log("%s", {});
  console.log("%s", { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7, i: 8, j: 9, k: 0 });
  console.log("%s", { message: "object message" });
  console.log("%s", { toString: () => "object toString" });
  console.log("%s", { message: "object message", toString: () => "object toString" });
  console.log("%s", {
    nestedObject: { message: "object message", toString: () => "object toString" },
  });
  console.log("%s", []);
  console.log("%s", [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0]);
  console.log("%s", /regexp/);
  console.log("%s", () => {});
  console.log("%s", function () {});
  console.log("%s", function namedFn() {});
  console.log("%s", class {});
  class NamedClass {
    constructor() {
      this.member1 = 0;
      this.member2 = 1;
    }
    member3() {}
  }
  console.log("%s", NamedClass);
  console.log(
    "%s",
    class {
      constructor() {
        this.member1 = 0;
        this.member2 = 1;
      }
      member3() {}
    },
  );
  console.log("%s", new NamedClass());
  console.log("%s", HtmlService);
  console.log("%s", { nestedClass: new NamedClass() });
  console.log("%s", { nestedGASAPI: HtmlService });
}

// oxlint-disable-next-line no-unused-vars
function testConsoleWithNumberFormat() {
  console.log("%d", true);
  console.log("%d", false);
  console.log("%d", 0);
  // oxlint-disable-next-line no-loss-of-precision
  console.log("%d", 12345678901234567890);
  // GAS does not support Bigint.
  // console.log("%d", 12345678901234567890n);
  // oxlint-disable-next-line no-loss-of-precision
  console.log("%d", 3.14159265358979323846);
  console.log("%d", Infinity);
  console.log("%d", NaN);
  console.log("%d", "");
  console.log("%d", "Hello, world!");
  // GAS does not support Symbol to Number.
  // console.log("%d", Symbol.for("sym"));
  console.log("%d", null);
  console.log("%d", undefined);
  console.log("%d", {});
  console.log("%d", { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7, i: 8, j: 9, k: 0 });
  console.log("%d", { message: "object message" });
  console.log("%d", { toString: () => "object toString" });
  console.log("%d", { message: "object message", toString: () => "object toString" });
  console.log("%d", {
    nestedObject: { message: "object message", toString: () => "object toString" },
  });
  console.log("%d", []);
  console.log("%d", [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0]);
  console.log("%d", /regexp/);
  console.log("%d", () => {});
  console.log("%d", function () {});
  console.log("%d", function namedFn() {});
  console.log("%d", class {});
  class NamedClass {
    constructor() {
      this.member1 = 0;
      this.member2 = 1;
    }
    member3() {}
  }
  console.log("%d", NamedClass);
  console.log(
    "%d",
    class {
      constructor() {
        this.member1 = 0;
        this.member2 = 1;
      }
      member3() {}
    },
  );
  console.log("%d", new NamedClass());
  console.log("%d", HtmlService);
  console.log("%d", { nestedClass: new NamedClass() });
  console.log("%d", { nestedGASAPI: HtmlService });
}

// oxlint-disable-next-line no-unused-vars
function testConsoleWithJsonFormat() {
  console.log("%j", true);
  console.log("%j", false);
  console.log("%j", 0);
  // oxlint-disable-next-line no-loss-of-precision
  console.log("%j", 12345678901234567890);
  // GAS does not support Bigint.
  // console.log("%j", 12345678901234567890n);
  // oxlint-disable-next-line no-loss-of-precision
  console.log("%j", 3.14159265358979323846);
  console.log("%j", Infinity);
  console.log("%j", NaN);
  console.log("%j", "");
  console.log("%j", "Hello, world!");
  console.log("%j", Symbol.for("sym"));
  console.log("%j", null);
  console.log("%j", undefined);
  console.log("%j", {});
  console.log("%j", { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7, i: 8, j: 9, k: 0 });
  console.log("%j", { message: "object message" });
  console.log("%j", { toString: () => "object toString" });
  console.log("%j", { message: "object message", toString: () => "object toString" });
  console.log("%j", {
    nestedObject: { message: "object message", toString: () => "object toString" },
  });
  console.log("%j", []);
  console.log("%j", [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0]);
  console.log("%j", /regexp/);
  console.log("%j", () => {});
  console.log("%j", function () {});
  console.log("%j", function namedFn() {});
  console.log("%j", class {});
  class NamedClass {
    constructor() {
      this.member1 = 0;
      this.member2 = 1;
    }
    member3() {}
  }
  console.log("%j", NamedClass);
  console.log(
    "%j",
    class {
      constructor() {
        this.member1 = 0;
        this.member2 = 1;
      }
      member3() {}
    },
  );
  console.log("%j", new NamedClass());
  console.log("%j", HtmlService);
  console.log("%j", { nestedClass: new NamedClass() });
  console.log("%j", { nestedGASAPI: HtmlService });
}

// oxlint-disable-next-line no-unused-vars
function testConsoleWithLogLevel() {
  console.log();
  console.info();
  console.warn();
  console.error();
}

// oxlint-disable-next-line no-unused-vars
function testConsoleWithTimer() {
  // throw error
  // console.timeEnd("");
  // console.timeEnd("label");
  console.time("");
  console.time("label");
  console.timeEnd("");
  console.timeEnd("label");
  // throw error
  // console.timeEnd("");
  // console.timeEnd("label");
}

// oxlint-disable-next-line no-unused-vars
function testConsoleWithOther() {
  console.log("%s %% %d %j", {}, 0, {});
  console.log("%s %% %i %d %j", {}, 0, {});
  console.log("%s %%%dd %j %d", {}, 0, {}, 10);
  console.log("%s %d %j %d", {}, 0, {}, 10, "a", 10, {});
  console.log({}, 0, {}, 10, "a");
}
