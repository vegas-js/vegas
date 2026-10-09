import { isHostService, type HostCall, type HostService } from "./host-call";
import type { RuntimeErrorSnapshot } from "./runtime-error";

export interface HostError extends RuntimeErrorSnapshot {
  readonly type: string;
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

/** Validate and snapshot the host transport envelope without invoking accessors. */
export function parseHostRequestEnvelope(value: unknown): HostRequestEnvelope | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  try {
    const id = getOwnDataValue(value, "id");
    const call = getOwnDataValue(value, "call");
    if (
      typeof id !== "number" ||
      !Number.isSafeInteger(id) ||
      id <= 0 ||
      !isHostCallEnvelope(call)
    ) {
      return undefined;
    }

    // Only the transport envelope is validated here. Service-specific arguments
    // remain the responsibility of the host dispatcher and handlers.
    return { id, call };
  } catch {
    // Revoked Proxies and throwing reflection traps are invalid messages.
    return undefined;
  }
}

export function isHostRequestEnvelope(value: unknown): value is HostRequestEnvelope {
  return parseHostRequestEnvelope(value) !== undefined;
}

function isHostCallEnvelope(value: unknown): value is HostCallEnvelope {
  if (!isRecord(value)) {
    return false;
  }
  const service = getOwnDataValue(value, "service");
  const operation = getOwnDataValue(value, "operation");
  return isHostService(service) && typeof operation === "string" && operation.length > 0;
}

function getOwnDataValue(value: object, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor !== undefined && "value" in descriptor ? descriptor.value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
