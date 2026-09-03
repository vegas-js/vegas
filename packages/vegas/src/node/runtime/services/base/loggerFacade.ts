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
          name: "toString",
          value: () => "Logger",
          writable: true,
        },
        {
          name: "clear",
          value: () => implementation.clear(),
          writable: true,
        },
        {
          name: "config",
          value: unsupportedLoggingLevelMethod,
          writable: true,
        },
        {
          name: "fine",
          value: unsupportedLoggingLevelMethod,
          writable: true,
        },
        {
          name: "finer",
          value: unsupportedLoggingLevelMethod,
          writable: true,
        },
        {
          name: "finest",
          value: unsupportedLoggingLevelMethod,
          writable: true,
        },
        {
          name: "getLog",
          value: () => implementation.getLog(),
          writable: true,
        },
        {
          name: "info",
          value: unsupportedLoggingLevelMethod,
          writable: true,
        },
        {
          name: "log",
          value: (dataOrFormat: unknown, ...values: unknown[]) => {
            Reflect.apply((implementation as any).log, implementation, [dataOrFormat, ...values]);

            return facade;
          },
          writable: true,
        },
        {
          name: "severe",
          value: unsupportedLoggingLevelMethod,
          writable: true,
        },
        {
          name: "warning",
          value: unsupportedLoggingLevelMethod,
          writable: true,
        },
      ],
    },
    createObject,
  );

  return facade;
}
