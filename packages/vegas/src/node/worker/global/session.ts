import type { RuntimeServicePort } from "../../runtime/protocol";
import { Session } from "../api/base/Session";
import type { CreateGasObject } from "./createGasObject";
import { createGasServiceObject } from "./createGasServiceObject";

export function createSession(
  sessionService: RuntimeServicePort<"Session">,
  createObject?: CreateGasObject,
) {
  const implementation = new Session(sessionService);

  return createGasServiceObject(
    {
      entries: [
        {
          kind: "method",
          name: "toString",
          value: () => "Session",
        },
        {
          kind: "method",
          name: "getActiveUser",
          value: () => implementation.getActiveUser(),
        },
        {
          kind: "method",
          name: "getActiveUserLocale",
          value: () => implementation.getActiveUserLocale(),
        },
        {
          kind: "method",
          name: "getEffectiveUser",
          value: () => implementation.getEffectiveUser(),
        },
        {
          kind: "method",
          name: "getScriptTimeZone",
          value: () => implementation.getScriptTimeZone(),
        },
        {
          kind: "method",
          name: "getTemporaryActiveUserKey",
          value: () => implementation.getTemporaryActiveUserKey(),
        },
        {
          kind: "method",
          name: "getTimeZone",
          value: () => implementation.getTimeZone(),
        },
        {
          kind: "method",
          name: "getUser",
          value: () => implementation.getUser(),
        },
      ],
    },
    createObject,
  );
}
