import type { InvocationScope } from "./runtime-boundary";
import type { DriveNamespace } from "./store";

export function resolveDriveNamespace(scope: InvocationScope): DriveNamespace {
  return { userKey: scope.userKey };
}
