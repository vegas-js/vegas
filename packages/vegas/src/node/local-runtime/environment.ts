import type { InvocationEnvironment } from "../runtime";
import type { RuntimeDataSession } from "../runtime-data";
import type { LocalRuntimeProject } from "./project";

export function createInvocationEnvironment(
  project: LocalRuntimeProject,
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
