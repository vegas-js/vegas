import type { CreateGasObject } from "../../globals/object";
import { createGasServiceObject } from "../../globals/serviceObject";
import type { RequestLegacySync } from "../../legacy/transport";
import { RuntimeScope } from "../../scope";
import { Lock } from "./Lock";
import { createLockFacade } from "./lockObjectFacade";

export interface CreateLockServiceOptions {
  documentLockAvailable?: boolean;
  createObject?: CreateGasObject;
}

export function createLockService(
  requestLegacySync: RequestLegacySync,
  options: CreateLockServiceOptions = {},
) {
  const { documentLockAvailable = true, createObject } = options;

  const documentLock = documentLockAvailable
    ? new Lock(RuntimeScope.DOCUMENT, requestLegacySync)
    : null;

  const createScriptLock = () =>
    createLockFacade(RuntimeScope.SCRIPT, requestLegacySync, createObject);

  const createUserLock = () => createLockFacade(RuntimeScope.USER, requestLegacySync, createObject);

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
          value: () => documentLock,
          writable: true,
        },
        {
          name: "getPrivateLock",
          value: () => createUserLock(),
          writable: true,
        },
        {
          name: "getPublicLock",
          value: () => createScriptLock(),
          writable: true,
        },
        {
          name: "getScriptLock",
          value: () => createScriptLock(),
          writable: true,
        },
        {
          name: "getUserLock",
          value: () => createUserLock(),
          writable: true,
        },
      ],
    },
    createObject,
  );
}
