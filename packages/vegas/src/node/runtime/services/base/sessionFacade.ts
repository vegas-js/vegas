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
          name: "toString",
          value: () => "Session",
          writable: true,
        },
        {
          name: "getActiveUser",
          value: () => implementation.getActiveUser(),
          writable: true,
        },
        {
          name: "getActiveUserLocale",
          value: () => implementation.getActiveUserLocale(),
          writable: true,
        },
        {
          name: "getEffectiveUser",
          value: () => implementation.getEffectiveUser(),
          writable: true,
        },
        {
          name: "getScriptTimeZone",
          value: () => implementation.getScriptTimeZone(),
          writable: true,
        },
        {
          name: "getTemporaryActiveUserKey",
          value: () => implementation.getTemporaryActiveUserKey(),
          writable: true,
        },
        {
          name: "getTimeZone",
          value: () => implementation.getTimeZone(),
          writable: true,
        },
        {
          name: "getUser",
          value: () => implementation.getUser(),
          writable: true,
        },
      ],
    },
    createObject,
  );
}
