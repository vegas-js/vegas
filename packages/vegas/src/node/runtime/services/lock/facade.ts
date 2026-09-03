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
          kind: "method",
          name: "toString",
          value: () => "LockService",
        },
        {
          kind: "method",
          name: "getDocumentLock",
          value: () => implementation.getDocumentLock(),
        },
        {
          kind: "method",
          name: "getPrivateLock",
          value: () => implementation.getUserLock(),
        },
        {
          kind: "method",
          name: "getPublicLock",
          value: () => implementation.getScriptLock(),
        },
        {
          kind: "method",
          name: "getScriptLock",
          value: () => implementation.getScriptLock(),
        },
        {
          kind: "method",
          name: "getUserLock",
          value: () => implementation.getUserLock(),
        },
      ],
    },
    createObject,
  );
}
