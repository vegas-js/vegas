import type { InvocationScope } from "../runtime";
import type { LocalRuntimeProject } from "./project";

export function createInvocationScope(project: LocalRuntimeProject): InvocationScope {
  return {
    scriptKey: project.root,
    userKey: "local-user",
  };
}
