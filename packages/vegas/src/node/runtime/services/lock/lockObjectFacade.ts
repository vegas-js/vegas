import type { CreateGasObject } from "../../globals/object";
import { createGasServiceObject } from "../../globals/serviceObject";
import type { RequestLegacySync } from "../../legacy/transport";
import type { RuntimeScope } from "../../scope";
import { Lock } from "./Lock";

export function createLockFacade(
  scope: RuntimeScope,
  requestLegacySync: RequestLegacySync,
  createObject?: CreateGasObject,
): GoogleAppsScript.Lock.Lock {
  const implementation = new Lock(scope, requestLegacySync);

  return createGasServiceObject(
    {
      entries: [
        {
          name: "toString",
          value: () => "Lock",
          writable: true,
        },
        {
          name: "hasLock",
          value: () => implementation.hasLock(),
          writable: true,
        },
        {
          name: "releaseLock",
          value: () => implementation.releaseLock(),
          writable: true,
        },
        {
          name: "tryLock",
          value: (timeoutInMillis: GoogleAppsScript.Integer) =>
            implementation.tryLock(timeoutInMillis),
          writable: true,
        },
        {
          name: "waitLock",
          value: (timeoutInMillis: GoogleAppsScript.Integer) =>
            implementation.waitLock(timeoutInMillis),
          writable: true,
        },
      ],
    },
    createObject,
  ) as unknown as GoogleAppsScript.Lock.Lock;
}
