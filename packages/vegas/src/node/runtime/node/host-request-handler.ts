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
    type: getHostErrorType(error, serialized.name),
  };
}

/** Preserve native/custom Error class names without reading instance accessors. */
function getHostErrorType(error: unknown, fallback: string): string {
  try {
    if (!(error instanceof Error)) {
      return "Error";
    }

    // Ignore an instance's `constructor` property: it may be a getter supplied
    // by the thrown object. Constructor metadata belongs to its prototype.
    let prototype = Object.getPrototypeOf(error) as object | null;
    while (prototype !== null) {
      const descriptor = Object.getOwnPropertyDescriptor(prototype, "constructor");
      if (descriptor !== undefined) {
        if (!("value" in descriptor) || typeof descriptor.value !== "function") {
          return fallback;
        }

        const name = Object.getOwnPropertyDescriptor(descriptor.value, "name")?.value;
        return typeof name === "string" && name.length > 0 ? name : fallback;
      }
      prototype = Object.getPrototypeOf(prototype) as object | null;
    }
  } catch {
    // Reflection on a revoked Proxy or an unexpected prototype must not prevent
    // the host from replying with the already-serialized error.
  }

  return fallback;
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
