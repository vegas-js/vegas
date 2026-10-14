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
    const call = snapshotHostCallEnvelope(getOwnDataValue(value, "call"));
    if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0 || call === undefined) {
      return undefined;
    }

    // Retain service-specific fields without invoking their accessors. The
    // dispatcher and handlers remain responsible for validating their values.
    return { id, call };
  } catch {
    // Revoked Proxies and throwing reflection traps are invalid messages.
    return undefined;
  }
}

export function isHostRequestEnvelope(value: unknown): value is HostRequestEnvelope {
  return parseHostRequestEnvelope(value) !== undefined;
}

function snapshotHostCallEnvelope(value: unknown): HostCallEnvelope | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const service = getOwnDataValue(value, "service");
  const operation = getOwnDataValue(value, "operation");
  if (!isHostService(service) || typeof operation !== "string" || operation.length === 0) {
    return undefined;
  }

  // Preserve service-specific own fields as descriptors, without invoking
  // accessors. The validated transport fields must not change on a second
  // read, even if a Proxy returns different descriptors later.
  const descriptors = Object.getOwnPropertyDescriptors(value);
  descriptors.service = { value: service, enumerable: true, configurable: true, writable: true };
  descriptors.operation = {
    value: operation,
    enumerable: true,
    configurable: true,
    writable: true,
  };
  return Object.defineProperties(
    Object.create(Object.getPrototypeOf(value)) as object,
    descriptors,
  ) as HostCallEnvelope;
}

function getOwnDataValue(value: object, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor !== undefined && "value" in descriptor ? descriptor.value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
