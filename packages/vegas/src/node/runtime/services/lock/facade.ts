import type { CreateGasObject } from "../../globals/object";
import { createGasServiceObject } from "../../globals/serviceObject";
import type { RequestLegacySync } from "../../legacy/transport";
import { RuntimeScope } from "../../scope";
import { Lock } from "./Lock";
import { LockService } from "./LockService";

export function createLockService(
  requestLegacySync: RequestLegacySync,
  createObject?: CreateGasObject,
) {
  const implementation = new LockService(
    new Lock(RuntimeScope.DOCUMENT, requestLegacySync),
    new Lock(RuntimeScope.SCRIPT, requestLegacySync),
    new Lock(RuntimeScope.USER, requestLegacySync),
  );

  return createGasServiceObject(
    {
      entries: [
        {
          name: "toString",
          value: () => "LockService",
          writable: true,
        },
        {
          name: "getDocumentLock",
          value: () => implementation.getDocumentLock(),
          writable: true,
        },
        {
          name: "getPrivateLock",
          value: () => implementation.getUserLock(),
          writable: true,
        },
        {
          name: "getPublicLock",
          value: () => implementation.getScriptLock(),
          writable: true,
        },
        {
          name: "getScriptLock",
          value: () => implementation.getScriptLock(),
          writable: true,
        },
        {
          name: "getUserLock",
          value: () => implementation.getUserLock(),
          writable: true,
        },
      ],
    },
    createObject,
  );
}
