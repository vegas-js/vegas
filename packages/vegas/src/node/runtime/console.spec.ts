import { describe, expect, test } from "vitest";

import { AppsScriptConsole, createConsole, type LoggingTarget } from "./index";

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
