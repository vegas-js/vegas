export interface LoggingTarget {
  error(...values: unknown[]): void;
  info(...values: unknown[]): void;
  log(...values: unknown[]): void;
  time(label: string): void;
  timeEnd(label: string): void;
  warn(...values: unknown[]): void;
}
