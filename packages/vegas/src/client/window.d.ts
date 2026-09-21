import type { ServerFunctionRun } from "./server-function-run";

export declare global {
  interface Window {
    google: {
      script: {
        run: ServerFunctionRun;
      };
    };
    vegas: {
      id?: string;
      hostOrigin?: string;
    };
  }
}
