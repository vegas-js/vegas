import type { CreateGasObject } from "../../globals/object";
import { createGasServiceObject } from "../../globals/serviceObject";
import type { RuntimeLogSink } from "../../logging";
import { Console } from "./console";

type ConsoleMethodName = "error" | "info" | "log" | "time" | "timeEnd" | "warn";

function forwardMethod(
  implementation: Console,
  name: ConsoleMethodName,
): (...args: unknown[]) => unknown {
  const method = implementation[name];

  if (typeof method !== "function") {
    throw new TypeError(`console.${name} is not callable.`);
  }

  return (...args: unknown[]) => Reflect.apply(method, implementation, args);
}

export function createConsole(logSink: RuntimeLogSink, createObject?: CreateGasObject) {
  const implementation = new Console(logSink);

  return createGasServiceObject(
    {
      entries: [
        {
          name: "error",
          value: forwardMethod(implementation, "error"),
          writable: false,
        },
        {
          name: "info",
          value: forwardMethod(implementation, "info"),
          writable: false,
        },
        {
          name: "log",
          value: forwardMethod(implementation, "log"),
          writable: false,
        },
        {
          name: "time",
          value: forwardMethod(implementation, "time"),
          writable: true,
        },
        {
          name: "timeEnd",
          value: forwardMethod(implementation, "timeEnd"),
          writable: true,
        },
        {
          name: "toString",
          value: () => "console",
          writable: true,
        },
        {
          name: "warn",
          value: forwardMethod(implementation, "warn"),
          writable: false,
        },
      ],
    },
    createObject,
  );
}
