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
