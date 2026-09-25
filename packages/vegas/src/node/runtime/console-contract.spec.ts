import { describe, expect, test } from "vitest";

import { createConsole, type LoggingTarget } from "./index";

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
// https://developers.google.com/apps-script/reference/base/console
describe("console public contract", () => {
  test("support documented logging levels, blank messages, formatting values, and timers", () => {
    const target = new RecordingLoggingTarget();
    const runtimeConsole = createConsole(target);
    const object = { message: "object" };

    expect(runtimeConsole.error()).toBeUndefined();
    expect(runtimeConsole.error("error: %s", "value")).toBeUndefined();
    expect(runtimeConsole.info()).toBeUndefined();
    expect(runtimeConsole.info(object)).toBeUndefined();
    expect(runtimeConsole.log()).toBeUndefined();
    expect(runtimeConsole.log("debug: %d", 2)).toBeUndefined();
    expect(runtimeConsole.warn()).toBeUndefined();
    expect(runtimeConsole.warn("warning")).toBeUndefined();
    expect(runtimeConsole.time("operation")).toBeUndefined();
    expect(runtimeConsole.timeEnd("operation")).toBeUndefined();

    // Apps Script writes these operations to Google logging services. Vegas preserves the
    // arguments at its local LoggingTarget boundary rather than modeling Cloud Logging transport.
    expect(target.calls).toStrictEqual([
      { method: "error", values: [] },
      { method: "error", values: ["error: %s", "value"] },
      { method: "info", values: [] },
      { method: "info", values: [object] },
      { method: "log", values: [] },
      { method: "log", values: ["debug: %d", 2] },
      { method: "warn", values: [] },
      { method: "warn", values: ["warning"] },
      { method: "time", values: ["operation"] },
      { method: "timeEnd", values: ["operation"] },
    ]);
  });
});
