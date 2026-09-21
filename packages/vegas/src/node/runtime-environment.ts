import type { RuntimeDataSession } from "../shared/gas";
import type { ResolvedProject } from "./project";
import type { InvocationEnvironment } from "./runtime";

export function createInvocationEnvironment(
  project: ResolvedProject,
  session?: RuntimeDataSession,
): InvocationEnvironment {
  return {
    activeUserEmail: session?.activeUserEmail ?? "",
    activeUserLocale: session?.activeUserLocale ?? "en",
    effectiveUserEmail: session?.effectiveUserEmail ?? "",
    scriptTimeZone: project.appsScript.manifest.timeZone ?? "UTC",
    temporaryActiveUserKey: session?.temporaryActiveUserKey ?? "",
  };
}
