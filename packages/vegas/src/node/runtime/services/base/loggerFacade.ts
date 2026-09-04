import type { CreateGasObject } from "../../globals/object";
import { createGasServiceObject } from "../../globals/serviceObject";
import type { RuntimeLogSink } from "../../logging";
import { Logger } from "./Logger";

function unsupportedLoggingLevelMethod(): never {
  throw new Error("Function not implemented.");
}

export function createLogger(logSink: RuntimeLogSink, createObject?: CreateGasObject) {
  const implementation = new Logger(logSink);

  let chainedFacade: Record<string, unknown>;

  const createFacade = (resolveLogReturn: () => Record<string, unknown>) =>
    createGasServiceObject(
      {
        entries: [
          {
            name: "toString",
            value: () => "Logger",
            writable: true,
          },
          {
            name: "clear",
            value: () => {
              implementation.clear();
              return null;
            },
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

              return resolveLogReturn();
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

  /*
   * Real GAS exposes a stable Logger object
   * as Logger.log()'s return value, distinct
   * from the global Logger object itself.
   *
   * Both facades share the same underlying
   * Logger state.
   */
  chainedFacade = createFacade(() => chainedFacade);

  return createFacade(() => chainedFacade);
}
