export type RuntimeLogMethod = "debug" | "error" | "info" | "log" | "warn";

export interface RuntimeLogSink {
  write(method: RuntimeLogMethod, prefix: string, message: string): void;
}
