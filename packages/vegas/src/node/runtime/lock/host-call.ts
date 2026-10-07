export type LockHostScope = "document" | "script" | "user";

export type LockHostCall =
  | {
      readonly service: "lock";
      readonly operation: "isAvailable";
      readonly namespace: LockHostScope;
    }
  | {
      readonly service: "lock";
      readonly operation: "acquire";
      readonly namespace: LockHostScope;
      readonly timeoutInMillis: number;
    }
  | {
      readonly service: "lock";
      readonly operation: "has";
      readonly namespace: LockHostScope;
    }
  | {
      readonly service: "lock";
      readonly operation: "release";
      readonly namespace: LockHostScope;
    };

export type LockHostCallResult<C extends LockHostCall> = C extends {
  readonly operation: "isAvailable" | "acquire" | "has";
}
  ? boolean
  : void;
