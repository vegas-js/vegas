import worker from "node:worker_threads";

import type { HostCallDispatcher } from "./host-dispatcher";
import type { HostError, HostRequestMessage, HostResponseMessage } from "./host-protocol";

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
  if (error instanceof Error) {
    return {
      name: error.name || "Error",
      type: error.constructor.name || error.name || "Error",
      message: error.message,
      ...(error.stack === undefined ? {} : { stack: error.stack }),
    };
  }

  return {
    name: "Error",
    type: "Error",
    message: String(error),
  };
}

export async function handleHostRequestMessage(
  port: worker.MessagePort,
  sharedArray: Int32Array,
  dispatcher: HostCallDispatcher,
  value: unknown,
): Promise<boolean> {
  if (!isHostRequestMessage(value)) {
    return false;
  }

  try {
    port.postMessage(await createHostResponse(dispatcher, value));
  } finally {
    Atomics.store(sharedArray, 0, 0);
    Atomics.notify(sharedArray, 0);
  }

  return true;
}

function isHostRequestMessage(value: unknown): value is HostRequestMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const request = value as {
    id?: unknown;
    call?: unknown;
  };

  if (typeof request.id !== "number" || typeof request.call !== "object" || request.call === null) {
    return false;
  }

  const call = request.call as {
    service?: unknown;
    operation?: unknown;
  };

  return (
    (call.service === "cache" ||
      call.service === "drive" ||
      call.service === "lock" ||
      call.service === "properties" ||
      call.service === "url-fetch") &&
    typeof call.operation === "string"
  );
}
