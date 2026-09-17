import type { CacheNamespace } from "./cache-store";
import type { InvocationScope } from "./scope";

// https://developers.google.com/apps-script/reference/cache/cache-service
export function resolveCacheNamespace(
  scope: InvocationScope,
  kind: CacheNamespace["kind"],
): CacheNamespace | undefined {
  switch (kind) {
    case "script": {
      return {
        kind,
        scriptKey: scope.scriptKey,
      };
    }
    case "user": {
      return {
        kind,
        scriptKey: scope.scriptKey,
        userKey: scope.userKey,
      };
    }
    case "document": {
      if (!scope.documentKey) {
        return undefined;
      }

      return {
        kind,
        scriptKey: scope.scriptKey,
        documentKey: scope.documentKey,
      };
    }
  }
}
