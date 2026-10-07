import worker from "node:worker_threads";

import type { HostBridge } from "../host-bridge";
import type { HostCall, HostCallResult } from "../host-call";
import type { HostError, HostRequestMessage, HostResponseMessage } from "../host-protocol";
import { isRuntimeErrorSnapshot, restoreRuntimeError } from "../runtime-error";
import { RuntimeInfrastructureError } from "../runtime-infrastructure-error";

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
  if (!isHostResponseMessage(response)) {
    throw new RuntimeInfrastructureError(
      "protocol",
      `Host response ${request.id} is missing or invalid.`,
    );
  }

  if (response.id !== request.id) {
    throw new RuntimeInfrastructureError(
      "protocol",
      `Host response id ${response.id} does not match request ${request.id}.`,
    );
  }

  if (!response.ok) {
    throwHostError(response.error);
  }

  return response.value as HostCallResult<C>;
}

function isHostResponseMessage(value: unknown): value is HostResponseMessage {
  if (!isRecord(value) || typeof value.id !== "number" || typeof value.ok !== "boolean") {
    return false;
  }

  if (value.ok) {
    return "value" in value;
  }

  return isHostError(value.error);
}

function isHostError(value: unknown): value is HostError {
  return isRecord(value) && typeof value.type === "string" && isRuntimeErrorSnapshot(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function throwHostError(error: HostError): never {
  const hostError = restoreRuntimeError(error) as Error & { type: string };
  hostError.type = error.type;

  throw hostError;
}
