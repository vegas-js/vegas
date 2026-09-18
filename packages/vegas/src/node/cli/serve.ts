import { runDevApplication } from "./core/dev-application";

export function runServe(root?: string) {
  return runDevApplication("development", root);
}
