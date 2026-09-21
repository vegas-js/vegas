import type { LocalRuntimeProject } from "./local-runtime-project";
import type { InvocationScope } from "./runtime";

export function createInvocationScope(project: LocalRuntimeProject): InvocationScope {
  return {
    scriptKey: project.root,
    userKey: "local-user",
  };
}
