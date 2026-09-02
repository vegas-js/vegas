import type { CreateGasObject } from "../../globals/object";
import { createGasServiceObject } from "../../globals/serviceObject";
import type { RuntimeServicePort } from "../../protocol";
import { Session } from "./Session";

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
