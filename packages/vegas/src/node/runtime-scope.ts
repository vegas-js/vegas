import type { ResolvedProject } from "./project";
import type { InvocationScope } from "./runtime";

export function createInvocationScope(project: ResolvedProject): InvocationScope {
  return {
    scriptKey: project.root,
    userKey: "local-user",
  };
}
