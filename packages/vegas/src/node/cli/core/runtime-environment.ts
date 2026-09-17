import { RuntimeDataTarget, type RuntimeDataSession } from "../../../shared/gas";
import type { InvocationEnvironment } from "../../runtime";
import type { ServeContext } from "./context";

export function createLegacyInvocationEnvironment(ctx: ServeContext): InvocationEnvironment {
  const session = ctx.mock[RuntimeDataTarget.Session] as RuntimeDataSession | undefined;

  return {
    activeUserEmail: session?.activeUserEmail ?? "",
    activeUserLocale: session?.activeUserLocale ?? "en",
    effectiveUserEmail: session?.effectiveUserEmail ?? "",
    scriptTimeZone: ctx.project.appsScript.manifest.timeZone ?? "UTC",
    temporaryActiveUserKey: session?.temporaryActiveUserKey ?? "",
  };
}
