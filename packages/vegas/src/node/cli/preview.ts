import { runDevApplication } from "../serve/application";

export function runPreview(root?: string) {
  return runDevApplication("production", root);
}
