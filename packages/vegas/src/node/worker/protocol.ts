import type { WebAppTriggerRequest } from "../runtime/triggers";

export type WorkerExecutionRequest =
  | {
      readonly kind: "function";
      readonly functionName: string;
      readonly args: readonly unknown[];
    }
  | {
      readonly kind: "web-app";
      readonly request: WebAppTriggerRequest;
    };
