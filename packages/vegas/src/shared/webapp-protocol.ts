export interface WebAppGasCallRequest {
  readonly requestId: number;
  readonly functionName: string;
  readonly args: readonly unknown[];
}

export type WebAppGasCallResponse =
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
