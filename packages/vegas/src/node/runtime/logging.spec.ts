import { describe, expect, expectTypeOf, test } from "vitest";

import {
  AppsScriptConsole,
  createConsole,
  createLogger,
  Logger,
  type LoggingTarget,
} from "./index";

type LoggingMethod = keyof LoggingTarget;

class RecordingLoggingTarget implements LoggingTarget {
  readonly calls: { readonly method: LoggingMethod; readonly values: readonly unknown[] }[] = [];

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

describe("AppsScriptConsole", () => {
  test("forward documented console operations to the logging target", () => {
    const target = new RecordingLoggingTarget();
    const runtimeConsole = createConsole(target);

    expect(runtimeConsole).toBeInstanceOf(AppsScriptConsole);

    runtimeConsole.error();
    runtimeConsole.error("error: %s", "value");
    runtimeConsole.info("info", { value: 1 });
    runtimeConsole.log();
    runtimeConsole.log("debug: %d", 2);
    runtimeConsole.warn("warning");
    runtimeConsole.time("operation");
    runtimeConsole.timeEnd("operation");

    expect(target.calls).toStrictEqual([
      { method: "error", values: [] },
      { method: "error", values: ["error: %s", "value"] },
      { method: "info", values: ["info", { value: 1 }] },
      { method: "log", values: [] },
      { method: "log", values: ["debug: %d", 2] },
      { method: "warn", values: ["warning"] },
      { method: "time", values: ["operation"] },
      { method: "timeEnd", values: ["operation"] },
    ]);
  });
});

describe("Logger", () => {
  test("match the Apps Script Logger contract", () => {
    const target = new RecordingLoggingTarget();

    expectTypeOf(createLogger(target)).toMatchTypeOf<GoogleAppsScript.Base.Logger>();
    expect(createLogger(target)).toBeInstanceOf(Logger);
  });

  test("record log messages and preserve raw values for the logging target", () => {
    const target = new RecordingLoggingTarget();
    const logger = createLogger(target);
    const structured = {
      message: "structured",
      data: { key: "value" },
    };
    const printable = {
      toString() {
        return "printable";
      },
    };

    expect(logger.log("plain")).toBe(logger);
    expect(logger.log("value: %s / %s", 12, true)).toBe(logger);
    expect(logger.log(structured)).toBe(logger);
    expect(logger.log(printable)).toBe(logger);

    expect(logger.getLog()).toBe("plain\nvalue: 12 / true\nstructured\nprintable");
    expect(target.calls).toStrictEqual([
      { method: "info", values: ["plain"] },
      { method: "info", values: ["value: %s / %s", 12, true] },
      { method: "info", values: [structured] },
      { method: "info", values: [printable] },
    ]);
  });

  test("clear the messages returned by getLog without mutating the logging target", () => {
    const target = new RecordingLoggingTarget();
    const logger = createLogger(target);

    logger.log("first").log("second");
    logger.clear();

    expect(logger.getLog()).toBe("");
    expect(target.calls).toHaveLength(2);

    logger.log("third");

    expect(logger.getLog()).toBe("third");
  });
});
