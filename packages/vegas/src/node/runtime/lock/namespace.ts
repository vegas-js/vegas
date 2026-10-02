import type { InvocationScope } from "./runtime-boundary";
import type { LockNamespace } from "./store";

// https://developers.google.com/apps-script/reference/lock/lock-service
export function resolveLockNamespace(
  scope: InvocationScope,
  kind: LockNamespace["kind"],
): LockNamespace | undefined {
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
