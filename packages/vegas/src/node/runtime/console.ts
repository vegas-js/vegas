import type { LoggingTarget } from "./logging-target";

// https://developers.google.com/apps-script/reference/base/console
export class AppsScriptConsole {
  readonly #target: LoggingTarget;

  constructor(target: LoggingTarget) {
    this.#target = target;
  }

  error(...values: unknown[]): void {
    this.#target.error(...values);
  }

  info(...values: unknown[]): void {
    this.#target.info(...values);
  }

  log(...values: unknown[]): void {
    this.#target.log(...values);
  }

  time(label: string): void {
    this.#target.time(label);
  }

  timeEnd(label: string): void {
    this.#target.timeEnd(label);
  }

  warn(...values: unknown[]): void {
    this.#target.warn(...values);
  }
}

export function createConsole(target: LoggingTarget): AppsScriptConsole {
  return new AppsScriptConsole(target);
}
