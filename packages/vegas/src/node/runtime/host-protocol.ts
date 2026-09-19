import { isHostService, type HostCall, type HostService } from "./host-call";

export interface HostError {
  readonly name: string;
  readonly type: string;
  readonly message: string;
  readonly stack?: string;
}

export interface HostCallEnvelope {
  readonly service: HostService;
  readonly operation: string;
}

export interface HostRequestEnvelope {
  readonly id: number;
  readonly call: HostCallEnvelope;
}

export interface HostRequestMessage<C extends HostCall = HostCall> extends HostRequestEnvelope {
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

export function isHostRequestEnvelope(value: unknown): value is HostRequestEnvelope {
  if (!isRecord(value) || !isRecord(value.call)) {
    return false;
  }

  return (
    typeof value.id === "number" &&
    Number.isSafeInteger(value.id) &&
    value.id > 0 &&
    isHostService(value.call.service) &&
    typeof value.call.operation === "string" &&
    value.call.operation.length > 0
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
