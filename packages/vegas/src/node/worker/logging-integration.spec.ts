import vm from "node:vm";

import { describe, expect, test } from "vitest";

import { createConsole } from "../runtime/console";
import { createLogger } from "../runtime/logger";
import type { LoggingTarget } from "../runtime/logging-target";
import type { Program } from "../runtime/program";

type LoggingMethod = keyof LoggingTarget;

class RecordingLoggingTarget implements LoggingTarget {
  readonly calls: {
    readonly method: LoggingMethod;
    readonly values: readonly unknown[];
  }[] = [];

  error(...values: unknown[]): void {
    this.#record("error", values);
  }

  info(...values: unknown[]): void {
    this.#record("info", values);
  }

  log(...values: unknown[]): void {
    this.#record("log", values);
  }

  time(label: string): void {
    this.#record("time", [label]);
  }

  timeEnd(label: string): void {
    this.#record("timeEnd", [label]);
  }

  warn(...values: unknown[]): void {
    this.#record("warn", values);
  }

  #record(method: LoggingMethod, values: readonly unknown[]): void {
    this.calls.push({ method, values });
  }
}

describe("worker logging integration", () => {
  test("expose Logger and console to runtime programs", () => {
    const program: Program = {
      source: `
function run() {
  Logger.log("Hello %s", "Vegas");
  console.warn("Heads up");
  return Logger.getLog();
}
`,
      htmlFiles: {},
    };
    const target = new RecordingLoggingTarget();
    const logger = createLogger(target);
    const context = vm.createContext({
      Logger: logger,
      console: createConsole(target),
    });

    new vm.Script(program.source).runInContext(context);

    expect(context.run()).toBe("Hello Vegas");
    expect(target.calls).toStrictEqual([
      {
        method: "info",
        values: ["Hello %s", "Vegas"],
      },
      {
        method: "warn",
        values: ["Heads up"],
      },
    ]);
  });
});
