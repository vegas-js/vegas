import type { DriveNamespace } from "./drive-store";
import type { InvocationScope } from "./scope";

export function resolveDriveNamespace(scope: InvocationScope): DriveNamespace {
  return { userKey: scope.userKey };
}
