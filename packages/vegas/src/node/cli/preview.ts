import { runDevApplication } from "./core/dev-application";

export function runPreview(root?: string) {
  return runDevApplication("production", root);
}
