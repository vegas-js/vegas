import type { HostCall } from "./host-call";

export interface HostError {
  readonly name: string;
  readonly type: string;
  readonly message: string;
  readonly stack?: string;
}

export interface HostRequestMessage<C extends HostCall = HostCall> {
  readonly id: number;
  readonly call: C;
}

export type HostResponseMessage<T = unknown> =
  | {
      readonly id: number;
      readonly ok: true;
      readonly value: T;
    }
  | {
      readonly id: number;
      readonly ok: false;
      readonly error: HostError;
    };
