import type { InvocationScope } from "../../runtime";
import type { ServeContext } from "./context";

export function createLegacyInvocationScope(ctx: ServeContext): InvocationScope {
  return {
    scriptKey: ctx.project.root,
    userKey: "local-user",
  };
}
