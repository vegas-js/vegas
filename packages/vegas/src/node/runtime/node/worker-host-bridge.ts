import worker from "node:worker_threads";

import type { HostBridge } from "../host-bridge";
import type { HostCall, HostCallResult } from "../host-call";
import type { HostError, HostRequestMessage, HostResponseMessage } from "../host-protocol";
import { isRuntimeErrorSnapshot, restoreRuntimeError } from "../runtime-error";
import {
  isRuntimeInfrastructureErrorKind,
  RuntimeInfrastructureError,
} from "../runtime-infrastructure-error";

class WorkerHostBridge implements HostBridge {
  readonly #port: worker.MessagePort;
  readonly #sharedArray: Int32Array;
  #nextRequestId = 0;

  constructor(port: worker.MessagePort, sharedArray: Int32Array) {
    this.#port = port;
    this.#sharedArray = sharedArray;
  }

  call<C extends HostCall>(call: C): HostCallResult<C> {
    this.#nextRequestId += 1;

    const request: HostRequestMessage<C> = {
      id: this.#nextRequestId,
      call,
    };

    Atomics.store(this.#sharedArray, 0, 1);

    try {
      this.#port.postMessage(request);
    } catch (error) {
      Atomics.store(this.#sharedArray, 0, 0);
      throw new RuntimeInfrastructureError(
        "serialization",
        `Apps Script host request ${request.id} could not be serialized.`,
        { cause: error },
      );
    }

    Atomics.wait(this.#sharedArray, 0, 1);

    const received = worker.receiveMessageOnPort(this.#port);

    return readHostResponse(request, received?.message);
  }
}

export function createWorkerHostBridge(
  port: worker.MessagePort,
  sharedArray: Int32Array,
): HostBridge {
  return new WorkerHostBridge(port, sharedArray);
}

export function readHostResponse<C extends HostCall>(
  request: HostRequestMessage<C>,
  response: unknown,
): HostCallResult<C> {
  const parsed = parseHostResponseMessage(response);
  if (parsed === undefined) {
    throw new RuntimeInfrastructureError(
      "protocol",
      `Host response ${request.id} is missing or invalid.`,
    );
  }

  if (parsed.id !== request.id) {
    throw new RuntimeInfrastructureError(
      "protocol",
      `Host response id ${parsed.id} does not match request ${request.id}.`,
    );
  }

  if (!parsed.ok) {
    throwHostError(parsed.error);
  }

  return parsed.value as HostCallResult<C>;
}

/** Snapshot own data fields so validation never executes accessors or inherited members. */
function parseHostResponseMessage(value: unknown): HostResponseMessage | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  try {
    const id = getOwnDataValue(value, "id");
    const ok = getOwnDataValue(value, "ok");
    if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0 || typeof ok !== "boolean") {
      return undefined;
    }

    if (ok) {
      const result = getOwnDataDescriptor(value, "value");
      return result === undefined ? undefined : { id, ok: true, value: result.value };
    }

    const error = parseHostError(getOwnDataValue(value, "error"));
    return error === undefined ? undefined : { id, ok: false, error };
  } catch {
    // A revoked Proxy or a throwing reflection trap is an invalid message.
    return undefined;
  }
}

function parseHostError(value: unknown): HostError | undefined {
  if (!isRecord(value) || !isRuntimeErrorSnapshot(value)) {
    return undefined;
  }

  const type = getOwnDataValue(value, "type");
  const name = getOwnDataValue(value, "name");
  const message = getOwnDataValue(value, "message");
  const stack = getOwnDataValue(value, "stack");
  const kind = getOwnDataValue(value, "infrastructureKind");
  const unsupported = getOwnDataValue(value, "unsupportedOperation");

  if (
    typeof type !== "string" ||
    typeof name !== "string" ||
    typeof message !== "string" ||
    (kind !== undefined && !isRuntimeInfrastructureErrorKind(kind))
  ) {
    return undefined;
  }

  let unsupportedOperation: HostError["unsupportedOperation"];
  if (unsupported !== undefined) {
    if (!isRecord(unsupported)) {
      return undefined;
    }
    const operation = getOwnDataValue(unsupported, "operation");
    const reason = getOwnDataValue(unsupported, "reason");
    if (typeof operation !== "string" || typeof reason !== "string") {
      return undefined;
    }
    unsupportedOperation = { operation, reason };
  }

  const error: HostError = {
    type,
    name,
    message,
    ...(typeof stack === "string" ? { stack } : {}),
    ...(kind !== undefined ? { infrastructureKind: kind } : {}),
    ...(unsupportedOperation !== undefined ? { unsupportedOperation } : {}),
  };

  // Reflection traps can change values between reads. Validate the snapshot as well.
  return isRuntimeErrorSnapshot(error) ? error : undefined;
}

function getOwnDataDescriptor(record: object, key: string): PropertyDescriptor | undefined {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  return descriptor !== undefined && "value" in descriptor ? descriptor : undefined;
}

function getOwnDataValue(record: object, key: string): unknown {
  return getOwnDataDescriptor(record, key)?.value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function throwHostError(error: HostError): never {
  const hostError = restoreRuntimeError(error) as Error & { type: string };
  hostError.type = error.type;

  throw hostError;
}
