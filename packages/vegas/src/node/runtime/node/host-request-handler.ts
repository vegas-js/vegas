import type { HostCallDispatcher } from "../host-dispatcher";
import {
  isHostRequestEnvelope,
  type HostError,
  type HostRequestMessage,
  type HostResponseMessage,
} from "../host-protocol";
import { serializeRuntimeError } from "../runtime-error";
import { RuntimeInfrastructureError } from "../runtime-infrastructure-error";

interface HostResponsePort {
  postMessage(value: HostResponseMessage): void;
}

export async function createHostResponse(
  dispatcher: HostCallDispatcher,
  request: HostRequestMessage,
): Promise<HostResponseMessage> {
  try {
    return {
      id: request.id,
      ok: true,
      value: await dispatcher.dispatch(request.call),
    };
  } catch (error) {
    return {
      id: request.id,
      ok: false,
      error: serializeHostError(error),
    };
  }
}

function serializeHostError(error: unknown): HostError {
  const serialized = serializeRuntimeError(error);

  return {
    ...serialized,
    type: error instanceof Error ? error.constructor.name || serialized.name : "Error",
  };
}

export async function handleHostRequestMessage(
  port: HostResponsePort,
  sharedArray: Int32Array,
  dispatcher: HostCallDispatcher,
  value: unknown,
): Promise<boolean> {
  if (!isHostRequestEnvelope(value)) {
    return false;
  }

  // WorkerHostBridge is the typed producer; only the transport envelope is validated here.
  const request = value as HostRequestMessage;

  try {
    const response = await createHostResponse(dispatcher, request);

    try {
      port.postMessage(response);
    } catch (error) {
      throw new RuntimeInfrastructureError(
        "serialization",
        `Host response ${request.id} could not be serialized.`,
        { cause: error },
      );
    }
  } finally {
    Atomics.store(sharedArray, 0, 0);
    Atomics.notify(sharedArray, 0);
  }

  return true;
}
