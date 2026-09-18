export interface LoggingTarget {
  error(...values: unknown[]): void;
  info(...values: unknown[]): void;
  log(...values: unknown[]): void;
  time(label: string): void;
  timeEnd(label: string): void;
  warn(...values: unknown[]): void;
}

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

// https://developers.google.com/apps-script/reference/base/logger
export class Logger {
  readonly #messages: string[] = [];
  readonly #target: LoggingTarget;

  constructor(target: LoggingTarget) {
    this.#target = target;
  }

  clear(): void {
    this.#messages.length = 0;
  }

  getLog(): string {
    return this.#messages.join("\n");
  }

  log(data: unknown): this;
  log(format: string, ...values: unknown[]): this;
  log(dataOrFormat: unknown, ...values: unknown[]): this {
    const message =
      typeof dataOrFormat === "string" && values.length > 0
        ? formatLoggerMessage(dataOrFormat, values)
        : resolveLoggerMessage(dataOrFormat);

    this.#messages.push(message);
    this.#target.info(dataOrFormat, ...values);

    return this;
  }
}

export function createConsole(target: LoggingTarget): AppsScriptConsole {
  return new AppsScriptConsole(target);
}

export function createLogger(target: LoggingTarget): Logger {
  return new Logger(target);
}

function formatLoggerMessage(format: string, values: readonly unknown[]): string {
  let index = 0;

  return format.replace(/%s/g, () => String(values[index++]));
}

function resolveLoggerMessage(data: unknown): string {
  if (typeof data === "object" && data !== null && "message" in data) {
    return String((data as { readonly message: unknown }).message);
  }

  return String(data);
}
