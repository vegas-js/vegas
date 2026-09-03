import type { CreateGasObject } from "../../globals/object";
import { createGasServiceObject } from "../../globals/serviceObject";
import type { RuntimeServicePort } from "../../protocol";
import { RuntimeScope } from "../../scope";
import { Cache } from "./Cache";
import { CacheService } from "./CacheService";

export function createCacheService(
  cacheService: RuntimeServicePort<"Cache">,
  createObject?: CreateGasObject,
) {
  const implementation = new CacheService(
    new Cache(RuntimeScope.DOCUMENT, cacheService),
    new Cache(RuntimeScope.SCRIPT, cacheService),
    new Cache(RuntimeScope.USER, cacheService),
  );

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
          value: () => implementation.getDocumentCache(),
          writable: true,
        },
        {
          name: "getScriptCache",
          value: () => implementation.getScriptCache(),
          writable: true,
        },
        {
          name: "getUserCache",
          value: () => implementation.getUserCache(),
          writable: true,
        },
        {
          name: "getPrivateCache",
          value: () => implementation.getUserCache(),
          writable: true,
        },
        {
          name: "getPublicCache",
          value: () => implementation.getScriptCache(),
          writable: true,
        },
      ],
    },
    createObject,
  );

  return value;
}
