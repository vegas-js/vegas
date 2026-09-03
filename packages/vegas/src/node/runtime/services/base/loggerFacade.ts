import type { CreateGasObject } from "../../globals/object";
import { createGasServiceObject } from "../../globals/serviceObject";
import type { RuntimeLogSink } from "../../logging";
import { Logger } from "./Logger";

function unsupportedLoggingLevelMethod(): never {
  throw new Error("Function not implemented.");
}

export function createLogger(logSink: RuntimeLogSink, createObject?: CreateGasObject) {
  const implementation = new Logger(logSink);

  let facade: Record<string, unknown>;

  facade = createGasServiceObject(
    {
      entries: [
        {
          kind: "method",
          name: "toString",
          value: () => "Logger",
        },
        {
          kind: "method",
          name: "clear",
          value: () => implementation.clear(),
        },
        {
          kind: "method",
          name: "config",
          value: unsupportedLoggingLevelMethod,
        },
        {
          kind: "method",
          name: "fine",
          value: unsupportedLoggingLevelMethod,
        },
        {
          kind: "method",
          name: "finer",
          value: unsupportedLoggingLevelMethod,
        },
        {
          kind: "method",
          name: "finest",
          value: unsupportedLoggingLevelMethod,
        },
        {
          kind: "method",
          name: "getLog",
          value: () => implementation.getLog(),
        },
        {
          kind: "method",
          name: "info",
          value: unsupportedLoggingLevelMethod,
        },
        {
          kind: "method",
          name: "log",
          value: (dataOrFormat: unknown, ...values: unknown[]) => {
            Reflect.apply((implementation as any).log, implementation, [dataOrFormat, ...values]);

            return facade;
          },
        },
        {
          kind: "method",
          name: "severe",
          value: unsupportedLoggingLevelMethod,
        },
        {
          kind: "method",
          name: "warning",
          value: unsupportedLoggingLevelMethod,
        },
      ],
    },
    createObject,
  );

  return facade;
}
