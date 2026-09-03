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
          kind: "property",
          name: "error",
          value: forwardMethod(implementation, "error"),
        },
        {
          kind: "property",
          name: "info",
          value: forwardMethod(implementation, "info"),
        },
        {
          kind: "property",
          name: "log",
          value: forwardMethod(implementation, "log"),
        },
        {
          kind: "method",
          name: "time",
          value: forwardMethod(implementation, "time"),
        },
        {
          kind: "method",
          name: "timeEnd",
          value: forwardMethod(implementation, "timeEnd"),
        },
        {
          kind: "method",
          name: "toString",
          value: () => "console",
        },
        {
          kind: "property",
          name: "warn",
          value: forwardMethod(implementation, "warn"),
        },
      ],
    },
    createObject,
  );
}
