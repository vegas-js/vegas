import worker from "node:worker_threads";

import { deserializeRuntimeError } from "../runtime/errorCodec";
import type {
  RuntimeMethod,
  RuntimeRequestFor,
  RuntimeResponse,
  RuntimeResult,
  RuntimeService,
  ServiceCaller,
} from "../runtime/protocol";

export function createRuntimeServiceCaller(
  sharedArray: Int32Array,
  port: worker.MessagePort,
): ServiceCaller {
  function requestRuntimeSync<
    Service extends RuntimeService,
    Method extends RuntimeMethod<Service>,
  >(request: RuntimeRequestFor<Service, Method>): RuntimeResult<Service, Method> {
    Atomics.store(sharedArray, 0, 1);
    port.postMessage(request);

    Atomics.wait(sharedArray, 0, 1);

    const received = worker.receiveMessageOnPort(port);
    if (!received) {
      throw new Error(`Runtime service returned no response: ${request.service}.${request.method}`);
    }

    const response = received.message as RuntimeResponse<RuntimeResult<Service, Method>>;
    switch (response.type) {
      case "service-result": {
        return response.result;
      }
      case "service-error": {
        throw deserializeRuntimeError(response.error);
      }
      default: {
        throw new Error(`Invalid runtime response: ${request.service}.${request.method}`);
      }
    }
  }

  return (service, method, ...args) =>
    requestRuntimeSync({
      type: "service-call",
      service,
      method,
      args,
    });
}
