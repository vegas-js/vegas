import type { CreateGasObject } from "../../globals/object";
import { createGasServiceObject } from "../../globals/serviceObject";
import type { RuntimeServicePort } from "../../protocol";
import { RuntimeScope } from "../../scope";
import { Cache } from "./Cache";
import { createCacheFacade } from "./cacheObjectFacade";

export interface CreateCacheServiceOptions {
  documentCacheAvailable?: boolean;
  createObject?: CreateGasObject;
}

export function createCacheService(
  cacheService: RuntimeServicePort<"Cache">,
  options: CreateCacheServiceOptions = {},
) {
  const { documentCacheAvailable = true, createObject } = options;

  const documentCache = documentCacheAvailable
    ? new Cache(RuntimeScope.DOCUMENT, cacheService)
    : null;

  const createScriptCache = () =>
    createCacheFacade(RuntimeScope.SCRIPT, "ScriptCache", cacheService, createObject);

  const createUserCache = () =>
    createCacheFacade(RuntimeScope.USER, "UserCache", cacheService, createObject);

  const value = createGasServiceObject(
    {
      entries: [
        {
          name: "toString",
          value: () => "CacheService",
          writable: true,
        },
        {
          name: "getDocumentCache",
          value: () => documentCache,
          writable: true,
        },
        {
          name: "getScriptCache",
          value: () => createScriptCache(),
          writable: true,
        },
        {
          name: "getUserCache",
          value: () => createUserCache(),
          writable: true,
        },
        {
          name: "getPrivateCache",
          value: () => createUserCache(),
          writable: true,
        },
        {
          name: "getPublicCache",
          value: () => createScriptCache(),
          writable: true,
        },
      ],
    },
    createObject,
  );

  return value;
}
