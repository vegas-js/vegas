export interface ServerFunctionCallRequest {
  readonly requestId: number;
  readonly functionName: string;
  readonly args: readonly unknown[];
}

export type ServerFunctionCallResponse =
  | {
      readonly requestId: number;
      readonly status: "ok";
      readonly result: unknown;
    }
  | {
      readonly requestId: number;
      readonly status: "err";
      readonly message: string;
    };
