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
          kind: "method",
          name: "toString",
          value: () => "CacheService",
        },
        {
          kind: "method",
          name: "getDocumentCache",
          value: () => implementation.getDocumentCache(),
        },
        {
          kind: "method",
          name: "getScriptCache",
          value: () => implementation.getScriptCache(),
        },
        {
          kind: "method",
          name: "getUserCache",
          value: () => implementation.getUserCache(),
        },
        {
          kind: "method",
          name: "getPrivateCache",
          value: () => implementation.getUserCache(),
        },
        {
          kind: "method",
          name: "getPublicCache",
          value: () => implementation.getScriptCache(),
        },
      ],
    },
    createObject,
  );

  return value;
}
