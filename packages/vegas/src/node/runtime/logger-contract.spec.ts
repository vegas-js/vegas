import { describe, expect, test } from "vitest";

import { createLogger, type LoggingTarget } from "./index";

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

// Public contract:
// https://developers.google.com/apps-script/reference/base/logger
describe("Logger public contract", () => {
  test("log data and formatted strings, retrieve the current log, and clear it", () => {
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

    const log = logger.getLog();

    expect(log).toContain("plain");
    expect(log).toContain("value: 12 / true");
    expect(log).toContain("structured");
    expect(log).toContain("printable");

    // Apps Script sends structured data to Cloud Logging as jsonPayload. Vegas keeps the original
    // value intact at its local logging-target boundary instead of inventing Cloud transport data.
    expect(target.calls[2]).toStrictEqual({
      method: "info",
      values: [structured],
    });

    expect(logger.clear()).toBeUndefined();
    expect(logger.getLog()).toBe("");
  });
});
