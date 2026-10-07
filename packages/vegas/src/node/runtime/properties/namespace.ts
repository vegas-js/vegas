import type { InvocationScope } from "./runtime-boundary";
import type { PropertiesNamespace } from "./store";

// https://developers.google.com/apps-script/reference/properties/properties-service
export function resolvePropertiesNamespace(
  scope: InvocationScope,
  kind: PropertiesNamespace["kind"],
): PropertiesNamespace | undefined {
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
