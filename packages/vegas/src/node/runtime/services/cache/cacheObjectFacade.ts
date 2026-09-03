import type { CreateGasObject } from "../../globals/object";
import { createGasServiceObject } from "../../globals/serviceObject";
import type { RuntimeServicePort } from "../../protocol";
import type { RuntimeScope } from "../../scope";
import { Cache } from "./Cache";

export type CacheFacadeName = "ScriptCache" | "UserCache";

export function createCacheFacade(
  scope: RuntimeScope,
  name: CacheFacadeName,
  cacheService: RuntimeServicePort<"Cache">,
  createObject?: CreateGasObject,
): GoogleAppsScript.Cache.Cache {
  const implementation = new Cache(scope, cacheService);

  return createGasServiceObject(
    {
      entries: [
        {
          name: "toString",
          value: () => name,
          writable: true,
        },
        {
          name: "get",
          value: (key: string) => implementation.get(key),
          writable: true,
        },
        {
          name: "getAll",
          value: (keys: string[]) => implementation.getAll(keys),
          writable: true,
        },
        {
          name: "put",
          value: (key: string, value: string, expirationInSeconds?: GoogleAppsScript.Integer) =>
            implementation.put(key, value, expirationInSeconds),
          writable: true,
        },
        {
          name: "putAll",
          value: (values: Record<string, string>, expirationInSeconds?: GoogleAppsScript.Integer) =>
            implementation.putAll(values, expirationInSeconds),
          writable: true,
        },
        {
          name: "remove",
          value: (key: string) => implementation.remove(key),
          writable: true,
        },
        {
          name: "removeAll",
          value: (keys: string[]) => implementation.removeAll(keys),
          writable: true,
        },
      ],
    },
    createObject,
  ) as unknown as GoogleAppsScript.Cache.Cache;
}
