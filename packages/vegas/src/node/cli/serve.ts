import { runDevApplication } from "../serve/application";

export function runServe(root?: string) {
  return runDevApplication("development", root);
}
